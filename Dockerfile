# Railway Dockerfile for React Dashboard
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./
COPY react-dashboard/frontend/package*.json ./react-dashboard/frontend/
COPY react-dashboard/backend/package*.json ./react-dashboard/backend/

# Install dependencies
RUN npm ci --only=production --no-audit --no-fund --cache /tmp/.npm-cache

# Copy source code (including public folder)
COPY react-dashboard/frontend/ ./react-dashboard/frontend/
COPY react-dashboard/backend/ ./react-dashboard/backend/

# Verify public folder exists
RUN ls -la react-dashboard/frontend/ && echo "--- Public folder contents ---" && ls -la react-dashboard/frontend/public/

# Build frontend
RUN cd react-dashboard/frontend && CI=false npm run build

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start application
CMD ["npm", "start"] 