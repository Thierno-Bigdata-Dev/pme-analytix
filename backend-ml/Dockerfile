FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Run as non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup -u 10001 appuser

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --default-timeout=1000 --retries 10 -r requirements.txt

# Install and compile CmdStan 2.33.1 in the exact directory expected by Prophet
RUN python -c "import cmdstanpy; cmdstanpy.install_cmdstan(version='2.33.1', dir='/usr/local/lib/python3.11/site-packages/prophet/stan_model', overwrite=True)"

COPY . .

# Grant permissions to non-root user
RUN chown -R appuser:appgroup /app

USER 10001

EXPOSE 8001
