/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import process from 'node:process';
import { hasProcessEnv, readFromProcessEnv } from '../utils';

export function buildWorkingDirectoryPathsForConfigFile() {
    const cwd : string[] = [
        process.cwd(),
    ];

    if (hasProcessEnv('WRITABLE_DIRECTORY_PATH')) {
        let writableDirectoryPath = readFromProcessEnv('WRITABLE_DIRECTORY_PATH');
        if (!path.isAbsolute(writableDirectoryPath)) {
            writableDirectoryPath = path.join(process.cwd(), writableDirectoryPath);
        }

        cwd.push(writableDirectoryPath);
    } else {
        cwd.push(path.join(process.cwd(), 'writable'));
    }

    return cwd;
}
