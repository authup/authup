/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { resolvePackagePath } from '../path';

export function getSwaggerEntrypoint() : { pattern: string, cwd: string } {
    return {
        cwd: path.join(resolvePackagePath(), 'src', 'http', 'controllers'),
        pattern: '**/*{.ts,.js,.d.ts}',
    };
}
