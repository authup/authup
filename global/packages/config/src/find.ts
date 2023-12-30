/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LocatorInfo } from 'locter';
import { buildFilePath, locateMany } from 'locter';

async function findFiles(path?: string[] | string) : Promise<LocatorInfo[]> {
    return locateMany([
        'authup.*.*.{conf,js,mjs,cjs,ts,mts,mts}',
        'authup.*.{conf,js,mjs,cjs,ts,mts,mts}',
        'authup.{conf,js,mjs,cjs,ts,mts,mts}',
    ], {
        path,
    });
}

export async function findDirectoryPaths(path?: string[] | string): Promise<string[]> {
    const locations = await findFiles(path);
    return locations.map(
        (location) => location.path,
    );
}

export async function findFilePaths(path?: string[] | string) : Promise<string[]> {
    const locations = await findFiles(path);

    return locations.map(
        (location) => buildFilePath(location),
    );
}
