# ================================
# Stage 1: Dependencies - Install production dependencies only
# ================================
FROM oven/bun:latest AS deps

WORKDIR /app

# Copy package files (Bun uses bun.lockb if available, otherwise works with package.json)
COPY package.json bun.lockb* yarn.lock* ./

# Copy cleanup script
COPY scripts/cleanup-node-modules.sh ./

# Install production dependencies and clean up in one layer
# Note: --frozen-lockfile works with bun.lockb, yarn.lock, or package.json
RUN bun install --production --frozen-lockfile && \
    chmod +x cleanup-node-modules.sh && \
    ./cleanup-node-modules.sh && \
    bun pm cache rm && \
    rm -rf /tmp/* /root/.cache cleanup-node-modules.sh

# ================================
# Stage 2: Builder - Build the TypeScript application
# ================================
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* yarn.lock* ./

# Install ALL dependencies (needed for building)
RUN bun install --frozen-lockfile

# Copy only necessary files for build
COPY tsconfig.json drizzle.config.ts ./
COPY src ./src

# Build TypeScript to JavaScript and cleanup in one layer
RUN bun run build && \
    bun pm cache rm && \
    rm -rf /tmp/* /root/.cache

# ================================
# Stage 3: Production - Ultra minimal runtime image
# ================================
FROM oven/bun:latest AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install dumb-init for signal handling (Bun image is Debian-based)
RUN apt-get update && \
    apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

# Create a non-root user for security
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Copy artifacts with correct ownership directly (eliminates 64MB duplicate layer)
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Create logs directories with proper permissions for the nextjs user
RUN mkdir -p logs/error logs/combined && \
    chown -R nextjs:nodejs logs

# Switch to non-root user
USER nextjs

# Expose the application port
EXPOSE 8020

# Health check using Bun
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD bun -e "require('http').get('http://localhost:8020/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start the application using dumb-init with Bun
CMD ["dumb-init", "bun", "dist/index.js"]