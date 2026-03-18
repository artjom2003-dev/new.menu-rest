FROM node:20-alpine AS base
RUN apk add --no-cache python3 make g++ vips-dev
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps

FROM base AS development
COPY . .
EXPOSE 3001
CMD ["npm", "run", "start:dev"]

FROM base AS build
COPY . .
RUN npm run build

FROM node:20-alpine AS production
RUN apk add --no-cache vips
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps
COPY --from=build /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main"]
