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
    exit 0
fi

case "${SERVICE}" in
    server/core)
        export HOST=0.0.0.0
        export PORT=3000
        exec npm run cli --workspace=apps/server-core -- "${COMMAND}" "$@"
        ;;
    # Retired: the admin console is served by server/core at <publicUrl>/admin
    # (plan 081). Exit non-zero on purpose: a container that terminates
    # SUCCESSFULLY having started nothing reads as a healthy run.
    client/admin-console)
        echo "The client/admin-console service no longer exists: server/core serves the admin console at <publicUrl>/admin." >&2
        echo "Remove this service from your deployment and start server/core alone." >&2
        exit 1
        ;;
    # Must exit non-zero: the container would otherwise terminate
    # SUCCESSFULLY having started nothing, which reads as a healthy run.
    *)
        echo "Unknown service: ${SERVICE}" >&2
        echo "Expected: server/core" >&2
        exit 1
        ;;
esac


