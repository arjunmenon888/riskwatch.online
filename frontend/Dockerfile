# --- builder: compile the Vite app ---
FROM node:20-alpine AS builder
WORKDIR /app

# install deps
COPY package*.json ./
RUN npm ci

# copy source and set Vite env var for build
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# build to /app/dist
RUN npm run build

# --- runner: serve with nginx ---
FROM nginx:stable-alpine
# listen on 8080 to match Railway's default PORT
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
