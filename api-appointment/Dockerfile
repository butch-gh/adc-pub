# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app/adc

# Copy root package files for workspace setup
COPY package*.json ./

# Copy api-appointment package file
COPY api-appointment/package*.json ./api-appointment/

# Install dependencies (this will install workspace dependencies)
RUN npm ci

# Copy source code
COPY api-appointment/src/ ./api-appointment/src/
COPY api-appointment/tsconfig.json ./api-appointment/

# Set working directory to api-appointment
WORKDIR /usr/src/app/adc/api-appointment

# Build the application
RUN npm run build

# Expose port
EXPOSE 5006

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5006/api/health || exit 1

# Start the application
CMD ["npm", "start"]