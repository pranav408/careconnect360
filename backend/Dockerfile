FROM maven:3.9.9-eclipse-temurin-17 AS build

WORKDIR /workspace

COPY pom.xml ./
RUN mvn -B -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -B -DskipTests clean package && \
    JAR_PATH="$(find target -maxdepth 1 -type f \
    -name '*.jar' \
    ! -name '*-sources.jar' \
    ! -name '*-javadoc.jar' \
    ! -name '*-plain.jar' \
    -print -quit)" && \
    test -n "$JAR_PATH" && \
    cp "$JAR_PATH" /tmp/app.jar

FROM eclipse-temurin:17-jre-jammy AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system appgroup \
    && useradd \
       --system \
       --gid appgroup \
       --create-home \
       --home-dir /app \
       --shell /usr/sbin/nologin \
       appuser

WORKDIR /app

COPY --from=build --chown=appuser:appgroup /tmp/app.jar /app/app.jar

USER appuser:appgroup

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]