FROM node:20

WORKDIR /code

COPY package*.json ./

# Install all deps including native builds inside container
RUN npm install --unsafe-perm

COPY . .

RUN npm run build

RUN mkdir -p /app/workspace

EXPOSE 3001

CMD ["npm", "start"]
