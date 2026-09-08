FROM node:22-alpine AS build

WORKDIR /app

COPY src/main/front/package*.json ./
RUN npm ci

COPY src/main/front ./
RUN npm run build

FROM nginx:1.27-alpine

COPY src/main/front/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
