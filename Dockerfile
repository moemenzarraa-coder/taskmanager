FROM eclipse-temurin:17-jre-alpine

RUN addgroup -S app && adduser -S app -G app

WORKDIR /app
COPY target/*.jar app.jar

USER app
EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]
