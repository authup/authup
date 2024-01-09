#!/bin/bash

#
# Copyright (c) 2023.
# Author Peter Placzek (tada5hi)
# For the full copyright and license information,
# view the LICENSE file that was distributed with this source code.
#

set -e

BASE_DIR=/usr/src/app
cd "${BASE_DIR}"

SERVICE="${1}"
shift

COMMAND="${1}"
shift

if [[ -z "${COMMAND}" || -z "${SERVICE}" ]]; then
    printf 'Usage:\n'
    printf '  <service> <command>\n    Run a specific service cli/script command.\n'
    printf 'Examples:\n'
    printf '  server/core start\n    Start the server core service.\n'
    printf '  client/web start\n    Reset a specific service\n'
    exit 0
fi

case "${SERVICE}" in
    server/core)
        export HOST=0.0.0.0
        export PORT=3000
        exec npm run cli --workspace=server/services/core -- "${COMMAND}" "$@"
        ;;
    client/web)
        export NUXT_HOST=0.0.0.0
        export NUXT_PORT=3000
        exec npm run "${COMMAND}" --workspace=client/services/web
        ;;
    *) echo "Unknown service: ${SERVICE}";;
esac


