FROM node:20-alpine

# Security: run as non-root
RUN addgroup -S etherlens && adduser -S etherlens -G etherlens

WORKDIR /app

# Install native build tools needed for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package files and install dependencies
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy server source
COPY server/index.js server/daemon.js server/aiAnalyzer.js server/aiDefender.js ./

# Own the files as the non-root user
RUN chown -R etherlens:etherlens /app
USER etherlens

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/healthz || exit 1

CMD ["node", "index.js"]
