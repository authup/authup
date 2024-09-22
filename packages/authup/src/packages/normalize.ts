/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PackageID } from './constants';

export function normalizePackageID(input: string) {
    const value = input.trim().toLowerCase();

    switch (value) {
        case 'client.web':
        case 'client/web':
        case 'client-web': {
            return PackageID.CLIENT_WEB;
        }
        case 'server.core':
        case 'server/core':
        case 'server-core': {
            return PackageID.SERVER_CORE;
        }
    }

    return undefined;
}
