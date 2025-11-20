# ================================
# Stage 1: Dependencies - Install production dependencies only
# ================================
FROM node:20-alpine AS deps

# Install libc6-compat for native modules if needed
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Copy cleanup script
COPY scripts/cleanup-node-modules.sh ./

# Install production dependencies and clean up in one layer
RUN yarn install --production --frozen-lockfile --ignore-scripts && \
    chmod +x cleanup-node-modules.sh && \
    ./cleanup-node-modules.sh && \
    yarn cache clean && \
    rm -rf /tmp/* /root/.cache /root/.npm /root/.yarn cleanup-node-modules.sh

# ================================
# Stage 2: Builder - Build the TypeScript application
# ================================
FROM node:20-alpine AS builder

# Install libc6-compat for native modules
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install ALL dependencies (needed for building)
RUN yarn install --frozen-lockfile --ignore-scripts

# Copy only necessary files for build
COPY tsconfig.json drizzle.config.ts ./
COPY src ./src

# Build TypeScript to JavaScript and cleanup in one layer
RUN yarn build && \
    yarn cache clean && \
    rm -rf /tmp/* /root/.cache /root/.npm /root/.yarn

# ================================
# Stage 3: Production - Ultra minimal runtime image
# ================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install dumb-init for signal handling
RUN apk add --no-cache dumb-init

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy artifacts with correct ownership directly (eliminates 64MB duplicate layer)
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Switch to non-root user
USER nextjs

# Expose the application port
EXPOSE 8020

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8020/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start the application using dumb-init
CMD ["dumb-init", "node", "dist/index.js"]