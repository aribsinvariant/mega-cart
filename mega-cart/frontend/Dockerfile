FROM node:22-alpine as builder

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build

FROM nginx:stable-alpine as production-stage

EXPOSE 80

COPY --from=builder /app/dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]