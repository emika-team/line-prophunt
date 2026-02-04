FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/api-service/package*.json ./packages/api-service/

# Install dependencies
RUN npm ci --workspace=packages/api-service

# Copy source
COPY packages/api-service ./packages/api-service

# Build
RUN npm run build --workspace=packages/api-service

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/packages/api-service/dist ./dist
COPY --from=builder /app/packages/api-service/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/main.js"]
