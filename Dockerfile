# Railway Dockerfile for React Dashboard
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./
COPY react-dashboard/frontend/package*.json ./react-dashboard/frontend/
COPY react-dashboard/backend/package*.json ./react-dashboard/backend/

# Install root dependencies
RUN npm ci --only=production --no-audit --no-fund

# Copy all source code at once
COPY . .

# Install frontend dependencies and build
RUN cd react-dashboard/frontend && npm ci && npm run build

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start application
CMD ["npm", "start"] 