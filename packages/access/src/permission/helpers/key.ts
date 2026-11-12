/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */


import type { BasePermission } from '../types.ts';

function encodeKeySegment(value: string): string {
    return encodeURIComponent(value).replaceAll('*', '%2A');
}

function formatKeySegment(value?: string | null): string {
    return value ? encodeKeySegment(value) : '*';
}

/**
 * The key of a permission namespace `(realmId, clientId, name)`. An absent
 * realm or client is `*`; a present segment and the name are URI-encoded with
 * `*` written as `%2A`, so neither a realm named `*` nor a `/` inside a
 * segment can collide with another namespace. Every value the server produces
 * (uuids, canonical names) keeps its literal form.
 */
export function buildPermissionKey(
    input: BasePermission,
) {
    return `${formatKeySegment(input.realmId)}/${formatKeySegment(input.clientId)}/${encodeKeySegment(input.name)}`;
}
