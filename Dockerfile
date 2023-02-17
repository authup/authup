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

ENV WRITABLE_DIRECTORY_PATH=/usr/src/app/writable

EXPOSE 3010

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD node packages/server/dist/cli/index.js -- healthcheck

ENTRYPOINT ["/bin/sh", "./entrypoint.sh"]
CMD ["start"]
