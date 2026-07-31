FROM node:24

WORKDIR /app
COPY package.json package-lock.json ./
COPY src ./src
COPY specs ./specs
RUN npm install
EXPOSE 4000
CMD ["npm", "run", "start"]
