# Base image: Official Node.js 20 Alpine for smaller footprint
FROM node:20-alpine

# Set working directory inside container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies strictly
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Expose the API port
EXPOSE 5000

# Start command
CMD ["npm", "start"]
