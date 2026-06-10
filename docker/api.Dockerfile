FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install
COPY . .
RUN npm run build --workspace packages/shared && npm run build --workspace apps/api
CMD ["npm", "run", "start", "--workspace", "apps/api"]
