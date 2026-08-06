FROM public.ecr.aws/docker/library/node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
# Coolify builders are often memory-constrained; raise heap for Vite.
# Peak RSS still grows if server+frontend compose builds run in parallel — prefer ≥4GB builder RAM.
ENV NODE_OPTIONS=--max-old-space-size=4096
ENV UV_THREADPOOL_SIZE=2
RUN npm run build

FROM public.ecr.aws/docker/library/nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh
EXPOSE 80
CMD ["/docker-entrypoint.sh"]
