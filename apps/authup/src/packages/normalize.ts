/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PackageID } from './constants';

export function normalizePackageID(input: string) : `${PackageID}` | null {
    const value = input.trim().toLowerCase();

    switch (value) {
        case 'client.admin-console':
        case 'client/admin-console':
        case 'client-admin-console': {
            return PackageID.CLIENT_ADMIN_CONSOLE;
        }
        case 'server.core':
        case 'server/core':
        case 'server-core': {
            return PackageID.SERVER_CORE;
        }
    }

    return null;
}
