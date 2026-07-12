/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const USER_AUTHENTICATOR_ATTEMPT_CACHE_PREFIX = 'mfaAttempt';

/**
 * Per-account exponential backoff for failed challenge codes:
 * lock = min(MAX, FACTOR * 2^(n-1)) seconds after the n-th failure,
 * reset on success. The counter itself expires after the window.
 */
export const USER_AUTHENTICATOR_ATTEMPT_LOCK_FACTOR = 1;
export const USER_AUTHENTICATOR_ATTEMPT_LOCK_MAX = 300;
export const USER_AUTHENTICATOR_ATTEMPT_WINDOW = 3_600;

export const USER_AUTHENTICATOR_TOTP_ALGORITHM = 'SHA1';
export const USER_AUTHENTICATOR_TOTP_DIGITS = 6;
export const USER_AUTHENTICATOR_TOTP_PERIOD = 30;

export const USER_AUTHENTICATOR_RECOVERY_CODE_COUNT = 10;

export const USER_AUTHENTICATOR_EMAIL_CODE_CACHE_PREFIX = 'mfaEmailCode';
export const USER_AUTHENTICATOR_EMAIL_CODE_LENGTH = 6;
export const USER_AUTHENTICATOR_EMAIL_CODE_EXPIRES_IN_MINUTES = 10;

export const USER_AUTHENTICATOR_WEBAUTHN_REG_CACHE_PREFIX = 'mfaWebauthnReg';
export const USER_AUTHENTICATOR_WEBAUTHN_AUTH_CACHE_PREFIX = 'mfaWebauthnAuth';
export const USER_AUTHENTICATOR_WEBAUTHN_CHALLENGE_WINDOW = 300;
