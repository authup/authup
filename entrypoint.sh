#!/bin/bash

#
# Copyright (c) 2022-2022.
# Author Peter Placzek (tada5hi)
# For the full copyright and license information,
# view the LICENSE file that was distributed with this source code.
#

set -e

cd /usr/src/app

exec npm run cli --workspace=packages/server -- "$@"
