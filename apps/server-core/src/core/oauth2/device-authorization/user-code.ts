/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createNanoID } from '@authup/kit';
import { OAUTH2_DEVICE_USER_CODE_ALPHABET, OAUTH2_DEVICE_USER_CODE_LENGTH } from './constants.ts';

const DEVICE_USER_CODE_PATTERN = new RegExp(`^[${OAUTH2_DEVICE_USER_CODE_ALPHABET}]{${OAUTH2_DEVICE_USER_CODE_LENGTH}}$`);

export function generateDeviceUserCode() : string {
    return createNanoID(OAUTH2_DEVICE_USER_CODE_ALPHABET, OAUTH2_DEVICE_USER_CODE_LENGTH);
}

export function normalizeDeviceUserCode(input: string) : string | null {
    const canonical = input.toUpperCase().replace(/[^A-Z0-9]/g, '');

    return DEVICE_USER_CODE_PATTERN.test(canonical) ? canonical : null;
}

export function formatDeviceUserCode(canonical: string) : string {
    return `${canonical.slice(0, 4)}-${canonical.slice(4)}`;
}
