
FROM node:18-alpine AS builder


RUN apk add --no-cache python3 make g++ vips-dev git

WORKDIR /app


COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine

WORKDIR /app

# copy เฉพาะสิ่งที่จำเป็นจาก builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "run", "start"]
