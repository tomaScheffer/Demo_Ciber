FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 5173

# Dev server (fast iteration for the lab). Sourcemaps are on either way.
CMD ["npm", "run", "dev"]
