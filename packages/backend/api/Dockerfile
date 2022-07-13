FROM node:16-alpine

RUN mkdir -p /usr/src/app
RUN mkdir -p /usr/src/app/writable

WORKDIR /usr/src/app

COPY package.json ./package.json

COPY . .

RUN rm -rf ./node-modules

RUN npm install &&\
  npm run build

RUN touch .env

COPY ./entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["/bin/sh", "./entrypoint.sh"]
CMD ["start"]
