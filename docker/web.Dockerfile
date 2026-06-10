FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install
COPY . .
RUN npm run build --workspace packages/shared && npm run build --workspace apps/web
CMD ["npm", "run", "preview", "--workspace", "apps/web"]
