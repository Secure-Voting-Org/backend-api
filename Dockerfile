# Base image: Official Node.js 20 Debian slim for better pre-build binary support (Canvas, TFJS)
FROM node:20-slim

# Set working directory inside container
WORKDIR /usr/src/app

# Install build dependencies for native modules like `canvas`
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies strictly
RUN npm ci --omit=dev

# Copy the rest of the application code
COPY . .

# Expose the API port
EXPOSE 5000

# Start command
CMD ["npm", "start"]
