FROM pgvector/pgvector:0.8.2-pg17-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-17-postgis-3 \
    && rm -rf /var/lib/apt/lists/*

COPY init.sh /docker-entrypoint-initdb.d/10-loadtest.sh