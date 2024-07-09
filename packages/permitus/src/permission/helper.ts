/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function parsePermissionID(id: string) : [string | null, string] {
    const [realmId, name] = id.split(':');

    return [
        realmId ?? null,
        name,
    ];
}
