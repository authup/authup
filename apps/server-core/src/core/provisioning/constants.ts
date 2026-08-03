/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * A realm provisioning entry declared with this name is a WILDCARD entry:
 * its relations are ensured in every realm (existing at boot, new at
 * creation) instead of declaring one specific realm. Literal only; partial
 * patterns (`tenant-*`) are not supported.
 */
export const REALM_WILDCARD_NAME = '*';
