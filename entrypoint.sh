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
    printf '  server/core start\n    Start the API and every enabled console on one listener.\n'
    printf '  server/core core\n    Start the API and the IdP alone; the page GETs redirect to the console service.\n'
    printf '  server/core console admin\n    Serve one console. Without a name, every enabled one on its own port.\n'
    printf '  server/core worker\n    Start the server core background worker (no http listener).\n'
    exit 0
fi

case "${SERVICE}" in
    server/core)
        export HOST=0.0.0.0
        export PORT=3000
        # typeorm resolves a nested workspace driver install (better-sqlite3)
        # through a process.cwd()/node_modules fallback and the lockfile nests
        # it under apps/server-core, so the CLI runs from that directory. The
        # cwd also keeps a relative DB_DATABASE resolving as before.
        cd "${BASE_DIR}/apps/server-core"
        # The configuration file is looked up in the cwd, which the line above
        # has just moved somewhere no operator would mount into. Name the image
        # root explicitly, so /usr/src/app/authup.yml is what the documentation
        # says it is.
        exec node ../authup/dist/index.mjs --configDirectory "${BASE_DIR}" "${COMMAND}" "$@"
        ;;
    # Retired: the admin console is served by server/core at <publicUrl>/console/admin
    # (plan 081). Exit non-zero on purpose: a container that terminates
    # SUCCESSFULLY having started nothing reads as a healthy run.
    client/admin-console)
        echo "The client/admin-console service no longer exists: server/core serves the admin console at <publicUrl>/console/admin." >&2
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


