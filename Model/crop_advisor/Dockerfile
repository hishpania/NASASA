# The crop advisor service. Build context: Model/crop_advisor/
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libexpat1 && rm -rf /var/lib/apt/lists/*
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_NO_DEV=1 PATH=/app/.venv/bin:$PATH
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-install-project
COPY crop_advisor/ crop_advisor/
COPY data/ data/
COPY --from=agdata . agdata/
COPY --from=outlook . outlook/
# The trained model is not in git: train it from the bundled dataset once, at build time.
RUN python -c "from crop_advisor.model import RotationModel; RotationModel.load_or_train()"
EXPOSE 8000
CMD ["uvicorn", "crop_advisor.main:app", "--host", "0.0.0.0", "--port", "8000"]
