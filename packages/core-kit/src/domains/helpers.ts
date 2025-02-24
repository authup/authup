/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function buildEntityChannelName(entity: string, id?: string | number) {
    return id ? `${entity}:${id}` : entity;
}

export function buildEntityNamespaceName(id: string) {
    return `/realm#${id}`;
}
