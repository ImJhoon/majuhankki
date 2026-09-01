FROM eclipse-temurin:17-jdk AS builder

WORKDIR /workspace

COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
RUN chmod +x gradlew

COPY src src
RUN ./gradlew bootJar --no-daemon
RUN cp /workspace/build/libs/*.jar /workspace/app.jar \
    && mkdir -p /workspace/unpacked \
    && cd /workspace/unpacked \
    && jar -xf /workspace/app.jar

FROM eclipse-temurin:17-jre

WORKDIR /app

ENV SPRING_PROFILES_ACTIVE=prod

RUN useradd --system --create-home appuser
COPY --from=builder --chown=appuser:appuser /workspace/unpacked/BOOT-INF/classes /app/classes
COPY --from=builder --chown=appuser:appuser /workspace/unpacked/BOOT-INF/lib /app/lib

USER appuser
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java -cp '/app/classes:/app/lib/*' org.example.project2.Project2Application --server.address=0.0.0.0 --server.port=${PORT:-8080}"]
