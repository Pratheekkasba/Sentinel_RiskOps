# Build stage
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B || true

COPY src ./src
RUN ./mvnw clean package -Dmaven.test.skip=true

# Run stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENV PORT=8080

ENTRYPOINT ["java", "-jar", "app.jar"]
