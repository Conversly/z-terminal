# Use a lightweight base image with Node.js
FROM node:20-alpine AS builder

# Create the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and yarn.lock files first for efficient caching
COPY package.json yarn.lock ./

RUN apk add --no-cache openssl openssl-dev

# Install dependencies for building the project
RUN yarn install --frozen-lockfile

# Copy the remaining project files
COPY . .

# Build the TypeScript project
RUN yarn build


# Expose the port the app will run on.
EXPOSE 8081

# Define the command to start the app
CMD ["yarn", "start"]
