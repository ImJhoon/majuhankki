FROM eclipse-temurin:17-jdk AS builder

WORKDIR /workspace

COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
RUN chmod +x gradlew

COPY src src
RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:17-jre

WORKDIR /app

ENV SPRING_PROFILES_ACTIVE=prod

RUN useradd --system --create-home appuser
COPY --from=builder --chown=appuser:appuser /workspace/build/libs/*.jar app.jar

USER appuser
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java -jar /app/app.jar --server.port=${PORT:-8080}"]
