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

case "${1}" in
    api) PACKAGE=api;;
    ui) PACKAGE=ui;;
    cli) PACKAGE=cli;;
    *) echo "Unknown package: ${1}";;
esac

shift

if [[ -z "${PACKAGE}" ]]; then
    printf 'Usage:\n'
    printf '  api <command>\n    Start or run the api application in dev mode.\n'
    printf '  ui <command>\n    Start or run the ui application in dev mode.\n'
    printf '  cli <command>\n    Run a cli command.\n'
    exit 0
fi

case "${PACKAGE}" in
    api)
        exec npm run "$1" --workspace=packages/server -- "$@"
        ;;
    ui)
        exec npm run "$1" --workspace=packages/ui -- "$@"
        ;;
    cli)
        export UI_PORT=3000
        export API_PORT=3001
        exec npm run cli --workspace=packages/authup -- "$@"
        ;;
esac


