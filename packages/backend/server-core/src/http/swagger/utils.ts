/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';

export function getSwaggerEntrypointRootPath() {
    return path.resolve(__dirname, '..', '..', '..', 'src', 'http', 'controllers');
}
