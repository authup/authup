FROM node:24-alpine

WORKDIR /opt/authup

COPY . .

RUN rm -rf ./node-modules
RUN apk add --update python3 make g++ && rm -rf /var/cache/apk/*
RUN npm ci
RUN npm run build

COPY ./entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh

# Configuration is operator input and read-only to the process; the log
# directory is the one thing it writes. There is no state directory: every
# durable value lives in the database.
RUN mkdir -p /etc/authup /var/log/authup

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production
ENV PROVISIONING_DIRECTORY_PATH=/etc/authup/provisioning
ENV LOG_DIRECTORY_PATH=/var/log/authup

EXPOSE 3000

# Probes the API listener, which `start` and `start core` open. A `start worker`
# container opens no port and a `start console` container binds the console
# ports instead, so those roles disable or override this check in their own
# deployment (see docs/src/guide/deployment/{worker,console-replicas}.md).
HEALTHCHECK --interval=10s --timeout=5s --retries=10 --start-period=5s \
    CMD wget --spider --proxy off http://127.0.0.1:${PORT}/ || exit 1

ENTRYPOINT ["/bin/sh", "./entrypoint.sh"]
CMD ["start"]
