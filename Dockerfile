FROM node:16-alpine

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY . .

RUN rm -rf ./node-modules && \
    npm ci && \
    npm run bootstrap && \
    npm run build && \
    touch packages/backend/api/.env


COPY ./entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh

EXPOSE 3010

ENTRYPOINT ["/bin/sh", "./entrypoint.sh"]
CMD ["cli", "start"]
