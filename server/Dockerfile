# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Install Chromium + deps for Puppeteer/Lighthouse, PostgreSQL client, and native module build tools
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    postgresql-client \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Tell Puppeteer to use the system-installed Chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema
COPY prisma ./prisma

# Copy application code
COPY . .

# Generate Prisma client (outputs to ./generated/prisma)
RUN npx prisma generate

# Expose port
EXPOSE 4004

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4004

# Start the application
CMD ["node", "index.js"]
