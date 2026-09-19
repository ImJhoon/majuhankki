# 로컬 부하 테스트 환경

Java 17, Spring Boot 4.0.7, Gradle을 그대로 사용한다. 이번 구성 범위는 전용 DB·Redis와 서버 기동 검증이며, 모의 AI·테스트 사용자 데이터·k6 시나리오는 아직 포함하지 않는다.

## 구성

| 대상 | 주소 / 이름 |
|---|---|
| Spring Boot | `http://127.0.0.1:8081`, `loadtest` 프로필 |
| PostgreSQL | `127.0.0.1:5433/project2_loadtest` |
| 앱 DB 계정 / 스키마 | `loadtest_app` (비관리자) / `loadtest` |
| 확장 스키마 | `public` (PostGIS, pgvector) |
| Redis | `127.0.0.1:6380`, 별도 인스턴스 |
| Compose 프로젝트 | `project2-loadtest` |
| 전용 볼륨 | `project2-loadtest_postgres-data`, `project2-loadtest_redis-data` |

모든 호스트 포트는 loopback에만 바인딩한다. 다른 PC의 k6에서 접근하는 구성은 별도 네트워크 설정이 필요하다. PC 한 대에서 k6·서버·DB를 실행하면 자원을 공유하므로 결과에 이 조건을 기록한다.

## 1. 최초 환경 준비

저장소 루트의 PowerShell에서 실행한다. Docker Desktop이 실행 중이어야 한다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File performance/init-env.ps1
docker compose --env-file performance/.env.loadtest -f performance/compose.loadtest.yml up -d --build --wait
```

스크립트는 32바이트 난수로 DB 비밀번호·Base64 JWT 키·감사 키를 만들고 Git 제외 파일 `performance/.env.loadtest`에만 저장한다. 기존 파일은 덮어쓰지 않는다. `ExecutionPolicy Bypass`는 해당 PowerShell 프로세스에만 적용하며 시스템 설정을 변경하지 않는다.

DB 이미지는 [pgvector 공식 이미지](https://github.com/pgvector/pgvector#docker)에 PostGIS를 추가한다. 최초 빈 볼륨에서만 확장·앱 계정·전용 스키마를 생성하는 방식은 [PostgreSQL 이미지 초기화 규칙](https://hub.docker.com/_/postgres)을 따른다. 기존 볼륨이 있으면 환경 파일의 비밀번호만 변경해도 DB 비밀번호가 바뀌지 않는다. 비밀값을 로그로 출력하는 `docker compose config`나 전체 `docker inspect` 결과를 공유하지 않는다.

## 2. 최초 Entity 스키마 준비

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File performance/run.ps1 prepare
```

이 모드만 `ddl-auto=update`로 테이블을 준비한다. `Started Project2Application`을 확인하고 Ctrl+C로 종료한다. `CommandAcceptanceException`, `SchemaManagementException`, DDL 실행 오류가 없음을 확인한다. `halt_on_error=true`로 DDL 오류 시 기동에 실패하도록 한다.

`update`는 기존 `import.sql`을 자동 실행하지 않는다. 이 단계에서는 사용자·지역 데이터가 없는 빈 환경이 정상이며, 매칭 테스트용 데이터 준비는 후속 작업이다. `spatial_ref_sys` 등 PostGIS 시스템 테이블은 수정하거나 삭제하지 않는다.

## 3. 컴파일·전체 테스트

서버를 종료한 상태에서 실행한다. 통합 테스트가 DB·Redis 상태를 변경할 수 있으므로 측정 데이터는 테스트 종료 후 준비한다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File performance/run.ps1 test
```

내부에서 `gradlew.bat compileJava test --rerun-tasks`를 실행한다. 테스트 보고서는 `build/reports/tests/test/index.html`에 생성된다. 성공 여부 외에도 `build/test-results/test/` 로그의 Hibernate DDL 오류를 확인한다.

## 4. 일반 서버 실행 및 확인

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File performance/run.ps1 start
```

일반 실행은 `ddl-auto=validate`로 스키마를 변경하지 않는다. 별도 PowerShell에서 확인한다.

```powershell
Invoke-RestMethod http://127.0.0.1:8081/actuator/health
docker compose --env-file performance/.env.loadtest -f performance/compose.loadtest.yml ps
docker compose --env-file performance/.env.loadtest -f performance/compose.loadtest.yml exec -T postgres psql -U loadtest_admin -d project2_loadtest -c "SELECT current_database(); SELECT extname, extversion FROM pg_extension;"
docker compose --env-file performance/.env.loadtest -f performance/compose.loadtest.yml exec -T redis redis-cli ping
```

Health 응답은 `UP`이어야 하며 기본 DB·Redis health contributor도 포함해 확인한다. 서버 로그에서 JDBC URL이 `127.0.0.1:5433/project2_loadtest`, 스키마가 `loadtest`, 활성 프로필이 `loadtest`인지 확인한다.

## 설정과 보안 범위

- `run.ps1`은 `SPRING_CONFIG_IMPORT`로 개발 `.env` 대신 테스트 파일을 사용하며 프로필은 `loadtest`만 활성화한다. 프로세스 종료 시 부모 스크립트 환경을 복원한다. 테스트 전용 스크립트 실행 시 다른 `SPRING_*`/`APP_*` 설정을 수동으로 주입하지 않는다.
- `application-loadtest.yml`은 AI → 인증 → DB → `loadtest/settings.yml` 순서로 가져온다. 마지막 파일이 전용 연결값을 덮어쓴다. `dev`, `prod`, `ai`, `auth`, `db`를 추가 프로필로 활성화하지 않는다.
- DB·Redis 주소와 앱 계정은 로컬 테스트 대상으로 고정한다. 개발 연결값으로 대체하지 않으며 필수 테스트 비밀값이 없으면 기동하지 못한다.
- 실제 Google AI 모델·연결 자동 구성을 제외한다. 현재 AI 클라이언트는 모델이 없는 fallback 경로를 사용하며 1536차원 모의 벡터 구현은 후속 작업이다.
- OAuth에는 비실제 클라이언트 값을 쓰고 Storage·Kakao API 키는 비운다. 인증 테스트는 LOCAL 계정으로 진행할 예정이다.
- Access Token 15분, Refresh Token 14일, Secure/HttpOnly 쿠키 및 CSRF 정책을 유지한다. CORS Origin은 새로 추가하지 않는다. 실제 쿠키 기반 로그인·갱신 시나리오 실행 전 로컬 HTTPS 구성을 추가해야 한다.
- 이 단계에서는 Actuator `health`만 노출한다. Prometheus·Grafana 연결은 후속 작업이며 기존 개발 모니터링 설정은 변경하지 않는다.

## 종료와 결과 보관

서버 콘솔에서 Ctrl+C로 종료하고 다음 명령으로 컨테이너를 종료한다. 볼륨은 보존된다.

```powershell
docker compose --env-file performance/.env.loadtest -f performance/compose.loadtest.yml down
```

자동 데이터 삭제·볼륨 초기화 기능은 제공하지 않는다. 다시 실행하려면 `up -d --wait` 후 `run.ps1 start`를 사용한다. 결과 로그는 Git에서 제외한 `performance/results/`에 보관하되 비밀번호·인증 토큰·개인정보는 출력하지 않는다.
