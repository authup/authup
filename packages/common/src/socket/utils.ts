/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function buildSocketEntityRoomName(type: string, id?: string | number) {
    return `${type}${id ? `#${id}` : ''}`;
}

export function buildSocketRealmNamespaceName(id: string) {
    return `/realm#${id}`;
}
