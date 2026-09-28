/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { UserAuthenticatorKind } from '@authup/core-kit';
import { createNanoID } from '@authup/kit';

// no ambiguous characters (0/o, 1/l/i) — codes get typed by hand
const RECOVERY_CODE_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
const RECOVERY_CODE_GROUP_LENGTH = 5;

export function generateRecoveryCode(): string {
    return `${createNanoID(RECOVERY_CODE_ALPHABET, RECOVERY_CODE_GROUP_LENGTH)}-${createNanoID(RECOVERY_CODE_ALPHABET, RECOVERY_CODE_GROUP_LENGTH)}`;
}

/**
 * Classify a bare one-time code by shape: an all-digit token is a TOTP
 * code, anything else (xxxxx-xxxxx) a recovery code. Used by the token
 * endpoint's `otp` parameter, which carries no explicit kind.
 */
export function guessUserAuthenticatorKindByResponse(response: string): `${UserAuthenticatorKind}` {
    return /^[0-9]{4,10}$/.test(response.trim()) ?
        UserAuthenticatorKind.TOTP :
        UserAuthenticatorKind.RECOVERY;
}

export function generateNumericCode(length: number): string {
    return createNanoID('0123456789', length);
}
