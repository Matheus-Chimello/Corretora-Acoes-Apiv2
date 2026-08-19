# syntax=docker/dockerfile:1

FROM node:22-alpine AS frontend-build

WORKDIR /workspace/src/main/front

COPY src/main/front/package*.json ./
RUN npm ci

COPY src/main/front ./
RUN npm run build

FROM maven:3.9.11-eclipse-temurin-17 AS build

WORKDIR /workspace

COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

COPY src ./src
COPY --from=frontend-build /workspace/src/main/front/dist ./src/main/resources/static
RUN mvn -q -DskipTests package

FROM eclipse-temurin:17-jre-jammy AS runtime

WORKDIR /app

RUN groupadd --system spring && useradd --system --gid spring spring

COPY --from=build --chown=spring:spring /workspace/target/*.jar app.jar

USER spring:spring

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
