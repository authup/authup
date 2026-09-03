#!/bin/sh

#
# Copyright (c) 2026.
# Author Peter Placzek (tada5hi)
# For the full copyright and license information,
# view the LICENSE file that was distributed with this source code.
#

set -e

BASE_DIR=/opt/authup

# One binary, so the container command is the CLI's own argument list:
# `start`, `start worker`, `start console admin`, `migration run`. The
# `server/core` prefix selected a binary while the image carried several.
# It is stripped through the 1.0.0-beta line and removed in v1.0.0.
if [ "${1}" = "server/core" ]; then
    echo "The 'server/core' prefix is deprecated and is removed in v1.0.0: pass the command directly (start, start worker, start console admin, migration run)." >&2
    shift
fi

# typeorm resolves a nested workspace driver install (better-sqlite3)
# through a process.cwd()/node_modules fallback and the lockfile nests
# it under apps/server-core, so the CLI runs from that directory. The
# cwd also keeps a relative DB_DATABASE resolving as before.
cd "${BASE_DIR}/apps/server-core"

# The configuration file is looked up in the cwd, which the line above
# has just moved somewhere no operator would mount into. Name /etc/authup
# explicitly: it is where the FHS puts configuration and what the
# documentation says. An empty or unknown command is the CLI's to refuse
# (usage, exit 1), so the container never terminates successfully having
# started nothing.
exec node ../authup/dist/index.mjs --configDirectory /etc/authup "$@"
