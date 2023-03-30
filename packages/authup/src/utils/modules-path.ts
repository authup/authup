/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';

export function getClosestNodeModulesPath() {
    return path.resolve(__dirname, '..', '..', 'node_modules');
}
