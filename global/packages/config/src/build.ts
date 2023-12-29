/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { readFromProcessEnv } from '@authup/core';
import { normalize } from 'pathe';

export function buildLookupDirectories(): string[] {
    const directories : string[] = [
        '.',
    ];

    const writableDirectoryPath = readFromProcessEnv('WRITABLE_DIRECTORY_PATH');
    if (writableDirectoryPath) {
        directories.push(normalize(writableDirectoryPath));
    } else {
        directories.push('writable');
    }

    const configDirectory = readFromProcessEnv('CONFIG_DIRECTORY');
    if (configDirectory) {
        directories.push(normalize(configDirectory));
    }

    return directories;
}
