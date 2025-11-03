FROM node:18-bullseye

# ติดตั้ง dependencies สำหรับ native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    make \
    g++ \
    git \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/app

# copy package files และติดตั้ง dependencies
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# copy source code ทั้งหมด
COPY . .

# ลบ cache ของ node_modules ถ้ามี
RUN rm -rf node_modules/.cache

EXPOSE 1337

CMD ["npm", "run", "develop"]
