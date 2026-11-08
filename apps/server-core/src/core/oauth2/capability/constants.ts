/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const OAUTH2_CAPABILITY_MAX_ENTRIES = 32;

/**
 * Measured in bytes of the `cap` parameter, not in characters.
 */
export const OAUTH2_CAPABILITY_MAX_BYTES = 4096;

export const OAUTH2_CAPABILITY_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export const OAUTH2_CAPABILITY_ACTION_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;
