FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# build จะล้มเหลวถ้าเพจ prerender มี error
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
