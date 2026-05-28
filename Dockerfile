FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL=/api
ARG NEXT_PUBLIC_BASE_PATH=
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/out /usr/share/nginx/html
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    location ~ \\.(txt|rsc)$ { \
        return 200 ""; \
        add_header Content-Type text/plain; \
    }  \
    location / { \
    root /usr/share/nginx/html;  \
    index index.html; \
    try_files $uri $uri.html $uri/ =404; \
    } \
    location /_next/static/ { \
    root /usr/share/nginx/html; \
    expires 1y; \
    add_header Cache-Control "public, max-age=31536000, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf
EXPOSE 80