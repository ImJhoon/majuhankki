#!/bin/bash
set -euo pipefail

# 개발 DB와 무관한 새 볼륨의 최초 기동에서만 실행된다.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    --set=app_password="$LOADTEST_DB_PASSWORD" <<'SQL'
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
CREATE ROLE loadtest_app LOGIN PASSWORD :'app_password';
CREATE SCHEMA loadtest AUTHORIZATION loadtest_app;
ALTER ROLE loadtest_app IN DATABASE project2_loadtest SET search_path = loadtest, public;
GRANT CONNECT ON DATABASE project2_loadtest TO loadtest_app;
GRANT USAGE ON SCHEMA public TO loadtest_app;
SQL
