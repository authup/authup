#!/bin/bash

#
# Copyright (c) 2026.
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
    printf '  server/core worker\n    Start the server core background worker (no http listener).\n'
    printf '  client/admin-console start\n    Start the admin console service.\n'
    exit 0
fi

case "${SERVICE}" in
    server/core)
        export HOST=0.0.0.0
        export PORT=3000
        exec npm run cli --workspace=apps/server-core -- "${COMMAND}" "$@"
        ;;
    client/admin-console)
        export NUXT_HOST=0.0.0.0
        export NUXT_PORT=3000
        exec npm run "${COMMAND}" --workspace=apps/client-admin-console
        ;;
    # Must exit non-zero: the container would otherwise terminate
    # SUCCESSFULLY having started nothing, which reads as a healthy run. The
    # client/web -> client/admin-console rename makes this reachable for any
    # deployment still passing the old name.
    *)
        echo "Unknown service: ${SERVICE}" >&2
        echo "Expected one of: server/core, client/admin-console" >&2
        exit 1
        ;;
esac


