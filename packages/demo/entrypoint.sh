#!/bin/bash

set -e

cd /usr/src/app

if [ "$1" = "start" ]; then
    exec node dist/index.js
fi

exec npm run "$@"
