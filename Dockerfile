FROM node:18-alpine

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY . .

RUN rm -rf ./node-modules
RUN npm ci
RUN node ./node_modules/@swc/core/postinstall.js
RUN npm run build

COPY ./entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh

RUN mkdir -p writable

ENV PORT 3000
ENV HOST 0.0.0.0

ENV NUXT_PORT 3000
ENV NUXT_HOST 0.0.0.0

ENV WRITABLE_DIRECTORY_PATH=/usr/src/app/writable

EXPOSE 3000
EXPOSE 3001
EXPOSE 3002

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD wget --proxy off --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

ENTRYPOINT ["/bin/sh", "./entrypoint.sh"]
CMD ["cli", "start"]
