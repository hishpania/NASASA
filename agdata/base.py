"""Core abstraction shared by all datasets."""

import asyncio
import json
import os
import re
import weakref
from typing import Any, ClassVar
from urllib import parse

import aiohttp
import pandas as pd

# (west, south, east, north) in decimal degrees.
Bbox = tuple[float, float, float, float]
# Keyword arguments carrying credentials: 'headers', 'params' and/or 'auth'.
Auth = dict[str, Any]

_TRANSIENT = frozenset({429, 502, 503, 504})
_AUTH: dict[type, Auth] = {}  # Authorization cache, one entry per class.
# Per event loop: authorization locks by class, request slots by host.
_LOCKS: weakref.WeakKeyDictionary[
    asyncio.AbstractEventLoop, dict[type, asyncio.Lock]
] = weakref.WeakKeyDictionary()
_SLOTS: weakref.WeakKeyDictionary[
    asyncio.AbstractEventLoop, dict[str | None, asyncio.Semaphore]
] = weakref.WeakKeyDictionary()


class DatasetError(RuntimeError):
    """A dataset API failed or answered unexpectedly."""


class Dataset:
    """A remote dataset accessed asynchronously through its web API.

    Pass an `aiohttp.ClientSession` to share connections; otherwise the
    instance opens its own, closed by `close()` or `async with`.

    Subclasses set `BASE_URL` and, when the API needs authorization, list
    the environment variables holding credentials in `CREDENTIALS` and
    override `_authorize`. Authorization runs once per class, on first use.
    Credentials are only sent over HTTPS to the `BASE_URL` host.
    """

    BASE_URL: ClassVar[str] = ''
    CREDENTIALS: ClassVar[tuple[str, ...]] = ()
    CREDENTIALS_OPTIONAL: ClassVar[bool] = False
    TIMEOUT: ClassVar[float] = 120
    MAX_BYTES: ClassVar[int] = 200 * 2**20  # Largest accepted response.
    CONCURRENCY: ClassVar[int] = 4  # Simultaneous requests per host.
    RETRIES: ClassVar[int] = 3  # GET retries on transient HTTP errors.

    _credentials: ClassVar[tuple[str, ...] | None] = None

    def __init__(self, session: aiohttp.ClientSession | None = None) -> None:
        self._http = session
        self._owns_http = session is None

    async def __aenter__(self) -> 'Dataset':
        return self

    async def __aexit__(self, *_: Any) -> None:
        await self.close()

    async def close(self) -> None:
        """Closes the HTTP session if this instance created it."""
        if self._owns_http and self._http is not None:
            await self._http.close()
            self._http = None

    @classmethod
    def login(cls, *credentials: str) -> None:
        """Sets credentials for this class and its subclasses.

        Overrides the `CREDENTIALS` environment variables.
        """
        cls._credentials = credentials
        for klass in [cls, *_subclasses(cls)]:
            _AUTH.pop(klass, None)

    @classmethod
    async def _authorize(cls, http: aiohttp.ClientSession,
                         credentials: tuple[str, ...]) -> Auth:
        """Returns request arguments carrying `credentials`."""
        del http, credentials
        return {}

    def _session(self) -> aiohttp.ClientSession:
        if self._http is None:
            self._http = aiohttp.ClientSession()
        return self._http

    async def _auth(self) -> Auth:
        """Returns the class authorization, obtaining it once."""
        cls = type(self)
        locks = _LOCKS.setdefault(asyncio.get_running_loop(), {})
        async with locks.setdefault(cls, asyncio.Lock()):
            if cls not in _AUTH:
                credentials = self._credentials or tuple(
                    os.environ.get(name) for name in cls.CREDENTIALS)
                if credentials and all(credentials):
                    _AUTH[cls] = await self._authorize(self._session(),
                                                       credentials)
                elif cls.CREDENTIALS and not cls.CREDENTIALS_OPTIONAL:
                    raise PermissionError(
                        f'{cls.__name__} needs credentials: call '
                        f'{cls.__name__}.login() or set {cls.CREDENTIALS}.')
                else:
                    _AUTH[cls] = {}
        return _AUTH[cls]

    async def _request(self, method: str, path: str = '', *,
                       public: bool = False, **kwargs: Any) -> bytes:
        """Sends a request and returns the response body.

        Args:
            method: HTTP method.
            path: Path under `BASE_URL`, or an absolute URL.
            public: Sends no credentials; allows any HTTPS host.
            **kwargs: `aiohttp` request arguments.
        """
        url = check_url(path if '://' in path else self.BASE_URL + path)
        if not public and _host(url) != _host(self.BASE_URL):
            raise DatasetError(f'Credentials refused for host {_host(url)}.')
        status, body = await self._send(method, url, public, kwargs)
        if status == 401 and not public and _AUTH.get(type(self)):
            _AUTH.pop(type(self), None)  # Expired token: authorize again.
            status, body = await self._send(method, url, public, kwargs)
        for attempt in range(self.RETRIES if method == 'GET' else 0):
            if status not in _TRANSIENT:
                break
            await asyncio.sleep(2 ** attempt)
            status, body = await self._send(method, url, public, kwargs)
        if status >= 400:
            raise DatasetError(
                f'{type(self).__name__}: HTTP {status} from {_strip(url)}: '
                f'{body[:300].decode(errors="replace")}')
        return body

    async def _send(self, method, url, public, kwargs) -> tuple[int, bytes]:
        auth = {} if public else await self._auth()
        timeout = aiohttp.ClientTimeout(total=self.TIMEOUT)
        slots = _SLOTS.setdefault(asyncio.get_running_loop(), {})
        async with slots.setdefault(_host(url),
                                    asyncio.Semaphore(self.CONCURRENCY)):
            try:
                async with self._session().request(
                        method, url, timeout=timeout,
                        **_merge(kwargs, auth)) as resp:
                    body = bytearray()
                    async for chunk in resp.content.iter_chunked(2**16):
                        body += chunk
                        if len(body) > self.MAX_BYTES:
                            raise DatasetError(
                                f'Response over {self.MAX_BYTES} B.')
                    return resp.status, bytes(body)
            except TimeoutError:
                if method != 'GET':
                    raise
                return 504, b'Timed out.'  # Retried as transient.

    async def _text(self, method: str, path: str = '', **kwargs: Any) -> str:
        return (await self._request(method, path, **kwargs)).decode(
            errors='replace')

    async def _json(self, method: str, path: str = '', **kwargs: Any) -> Any:
        body = await self._request(method, path, **kwargs)
        try:
            return json.loads(body)
        except ValueError as error:
            raise DatasetError(f'{type(self).__name__}: not JSON: '
                               f'{body[:200].decode(errors="replace")}'
                               ) from error


def check_point(lat: Any, lon: Any) -> tuple[float, float]:
    """Returns valid WGS84 coordinates as floats."""
    lat, lon = float(lat), float(lon)
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise ValueError(f'Invalid coordinates: {lat}, {lon}.')
    return lat, lon


def check_bbox(bbox: Any) -> Bbox:
    """Returns a valid (west, south, east, north) bbox of floats."""
    west, south, east, north = map(float, bbox)
    check_point(south, west)
    check_point(north, east)
    if not (west < east and south < north):
        raise ValueError(f'Invalid bbox: {bbox}.')
    return west, south, east, north


def check_name(value: Any, pattern: str = r'[\w.-]+') -> str:
    """Returns `value` as text if it fully matches `pattern`."""
    value = str(value)
    if not re.fullmatch(pattern, value) or '..' in value:
        raise ValueError(f'Invalid identifier: {value!r}.')
    return value


def check_url(url: str, hosts: set[str] | None = None) -> str:
    """Returns `url` if it is HTTPS (and, if given, on one of `hosts`)."""
    parts = parse.urlsplit(url)
    if parts.scheme != 'https' or (hosts and parts.hostname not in hosts):
        raise DatasetError(f'Untrusted URL: {_strip(url)}')
    return url


def sql_text(value: Any) -> str:
    """Quotes a value as an SQL string literal."""
    return "'" + str(value).replace("'", "''") + "'"


def date(value: Any, fmt: str = '%Y-%m-%d') -> str:
    """Formats any date-like value (str, datetime, Timestamp) with `fmt`."""
    return pd.Timestamp(value).strftime(fmt)


def numeric(frame: pd.DataFrame) -> pd.DataFrame:
    """Converts the columns holding only numbers (as text) to numbers."""
    for column in frame:
        try:
            frame[column] = pd.to_numeric(frame[column])
        except (ValueError, TypeError):
            pass
    return frame


def bulk(*_: Any, **__: Any) -> pd.DataFrame:
    """Placeholder for rate-limited endpoints that need bulk downloads."""
    raise NotImplementedError('Bulk, rate-limited download: not implemented.')


def _merge(kwargs: dict[str, Any], auth: Auth) -> dict[str, Any]:
    merged = {**kwargs, **auth}
    for key in ('headers', 'params'):
        if kwargs.get(key) and key in auth:
            merged[key] = {**kwargs[key], **auth[key]}
    return merged


def _host(url: str) -> str | None:
    return parse.urlsplit(url).hostname


def _strip(url: str) -> str:
    """Drops the query string, which may carry API keys."""
    return parse.urlsplit(url)._replace(query='').geturl()


def _subclasses(cls: type) -> list[type]:
    return [s for c in cls.__subclasses__() for s in [c, *_subclasses(c)]]
