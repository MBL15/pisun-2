# Один Dockerfile на все сервисы: docker build --build-arg SERVICE=event-service .
FROM maven:3.9.9-eclipse-temurin-21 AS build
ARG SERVICE
WORKDIR /src
COPY pom.xml .
COPY common-lib/pom.xml common-lib/
COPY api-gateway/pom.xml api-gateway/
COPY identity-service/pom.xml identity-service/
COPY event-service/pom.xml event-service/
COPY ai-moderation-service/pom.xml ai-moderation-service/
COPY doc-generator-service/pom.xml doc-generator-service/
RUN mvn -q -B -pl ${SERVICE} -am dependency:go-offline -DskipTests || true
COPY . .
RUN mvn -q -B -pl ${SERVICE} -am -DskipTests package

FROM eclipse-temurin:21-jre
ARG SERVICE
WORKDIR /app
COPY --from=build /src/${SERVICE}/target/${SERVICE}.jar app.jar
ENV JAVA_OPTS="-Xmx384m" \
    SPRING_PROFILES_ACTIVE=docker
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
