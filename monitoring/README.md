# 개발 환경 모니터링

Grafana의 `Project2 API·매칭 성능 모니터링`은 API 지연과 오류, 매칭 탐색, DB 연결 병목을 함께 비교하는 16개 패널을 제공한다.

## 적용

1. Docker Desktop을 실행하고 `.env`의 `GRAFANA_ADMIN_PASSWORD`를 설정한다.
2. 프로젝트 루트에서 `docker compose up -d prometheus grafana`를 실행한다. 기존 Grafana가 실행 중이면 데이터 소스 provisioning 변경을 적용하도록 `docker compose restart grafana`를 실행한다.
3. 백엔드를 `dev` 프로필로 재시작한다. 기본 프로필이 dev인 환경에서는 `.\gradlew.bat bootRun`을 사용한다. HTTP 히스토그램 설정은 재시작 이후 적용된다.
4. `http://localhost:3001`에 로그인하고 대시보드를 연다. Prometheus는 `http://localhost:9090`에서 확인한다.
5. 실제 API 요청과 매칭 흐름을 실행한 후 최소 1분 정도 수집한다. 두 번 이상의 scrape가 필요하며 무트래픽 또는 적은 표본으로 성능을 판단하지 않는다.

## 읽는 순서

| 패널 | 해석 |
| --- | --- |
| 수집 상태·HTTP 요청량 | 수집 여부와 부하 크기를 먼저 확인한다. HTTP 통계는 Actuator 요청을 제외한다. |
| API별 p95/p99·5xx 비율 | 느린 메서드/URI 템플릿과 서버 오류를 확인한다. p95/p99는 히스토그램 추정값이다. |
| 매칭 탐색 시도량·p95·결과 비율 | 재시도를 포함한 탐색 호출을 측정한다. `no_candidate`는 후보 부족이지 기술적 오류가 아니다. |
| HikariCP 연결 수·대기 수·획득 시간·타임아웃 | 연결 풀 포화 여부를 확인한다. 획득 시간은 SQL 실행 시간이 아니다. |
| CPU·JVM 메모리 | 부하와 자원 사용량의 변화를 비교한다. |

5xx 시계열이 아직 없더라도 HTTP 요청이 있으면 오류율은 0%다. 요청이 없는 구간에는 오류율을 표시하지 않는다. 수집이 중단되면 rate 계산 구간 안에 과거 표본이 남아 잠시 값이 보일 수 있으므로 수집 상태를 먼저 확인한다. 연결 획득이 없는 구간의 평균 획득 시간도 표시하지 않는다.

최종 매칭 수는 양쪽 수락 후 커밋된 건수의 `increase` 추정값이며 구간 외삽 때문에 소수가 나올 수 있다. 탐색 결과 비율을 사용자 성사율로 사용하거나 탐색 p95를 사용자 대기 시간으로 해석하지 않는다. 대기열 길이, 요청부터 매칭까지의 시간, Redis 복구 지표는 아직 추가 계측이 필요하다.

## 포트폴리오 실험 기록

같은 서버 사양·데이터 규모·부하·실행 시간으로 개선 전후를 비교한다. 실제 RPS, API p95/p99, 5xx 비율, 매칭 탐색 p95, DB 연결 대기를 함께 기록한다. 데이터 준비와 워밍업 구간은 측정 구간과 구분한다. 대시보드 시간 범위를 실험 구간으로 맞춰 캡처하고 변경 커밋과 부하 스크립트를 함께 보관한다.

운영 프로필은 Prometheus export를 비활성화하고 health만 노출한다. 이 변경에는 운영 메트릭 공개, 알림 전송, DB 마이그레이션이 포함되지 않는다.

설정 참고: [Spring Boot Metrics](https://docs.spring.io/spring-boot/reference/actuator/metrics.html), [Grafana Prometheus 변수](https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/).
