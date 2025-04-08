FROM node:22-alpine

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY . .

RUN rm -rf ./node-modules
RUN apk add --update python3 make g++ && rm -rf /var/cache/apk/*
RUN npm ci
RUN node ./node_modules/@swc/core/postinstall.js
RUN npm run build

COPY ./entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh

RUN mkdir -p ./writable

ENV PORT=3000
ENV NODE_ENV=production
ENV WRITABLE_DIRECTORY_PATH=/usr/src/app/writable

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=10 --start-period=5s \
    CMD wget --spider --proxy off http://127.0.0.1:3000/ || exit 1

ENTRYPOINT ["/bin/sh", "./entrypoint.sh"]
CMD ["server/core", "start"]
