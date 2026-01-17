FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Install miniprogram-ci for CI/CD operations
RUN npm install -g miniprogram-ci

# Copy source code
COPY . .

# Keep the container running for health check and manual operations
CMD ["tail", "-f", "/dev/null"]
