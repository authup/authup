/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

module.exports = {
    resolve: {
        // for WebStorm, remove this after refactoring
        alias: {
            '@typescript-auth/domains': path.resolve(__dirname, 'packages/common/domains/src'),
        },
    },
};
