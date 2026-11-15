Field Shift: NASA POWER cache + automatic historical baseline

Copy ONLY main.py and nasa_power.py to G:\Hackathon (replace old files).
Leave all other .py and .csv files unchanged.

Run:
python main.py --lat 42.03 --lon -93.62 --year 2027 --history "2024:Wheat,2025:Maize,2026:Sunflower"

At current date (2026) default historical period is 2016-2025 (10 complete years).
The first call with each combination of coordinates/years downloads from NASA POWER.
Future runs load cached JSON from data/nasa_power_cache/.
Cache is keyed by exact coordinates, start/end, API parameters, and time standard.

Options:
  --climate-years 15                 last 15 complete years (2011-2025 in 2026)
  --start-year 2020 --end-year 2025  reproduce old 6-year baseline
  --refresh-climate                 force reload and replace NASA cache
  --ph 6.5                          use a manually measured/test pH

Same year/coordinates and CLI options should give the same recommendations as before,
except the NASA POWER data now comes from local cache on repeated calls.
Different reference periods MAY change rankings, as they use more climate history.
The planning year does not predict future climate; it affects crop rotation advice.

Full 10-year daily query is larger, so initial download may be slower than 6-year query.
The code fails clearly if NASA API isn't reachable; cache works offline once populated.
