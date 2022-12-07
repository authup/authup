/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';

export function getSwaggerEntrypoint() : { pattern: string, cwd: string } {
    return {
        cwd: path.resolve(__dirname, '..', '..', 'src', 'controllers'),
        pattern: '**/*{.ts,.js,.d.ts}',
    };
}
