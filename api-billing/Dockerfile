# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app/adc/api-billing

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci 

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build the application
RUN npm run build

# optional: remove dev deps after build
RUN npm prune --omit=dev

# Expose port
EXPOSE 5013

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5013/api/health || exit 1

# Start the application
CMD ["npm", "start"]