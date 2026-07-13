/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// Failed-attempt counter — a raw number bumped via the cache's atomic
// increment, so concurrent failures (verify or confirm) never under-count
// the exponential backoff. The lockout deadline lives under its own prefix.
export const USER_AUTHENTICATOR_ATTEMPT_CACHE_PREFIX = 'mfaAttempt';
export const USER_AUTHENTICATOR_THROTTLE_CACHE_PREFIX = 'mfaThrottle';

// Per-user lock serializing concurrent verify critical sections so a factor
// (recovery code / TOTP step) is consumed exactly once. The TTL only bounds a
// crashed request holding the lock — generous relative to a verify (a bcrypt
// compare / seed decrypt + one save).
export const USER_AUTHENTICATOR_VERIFY_LOCK_CACHE_PREFIX = 'mfaVerifyLock';
export const USER_AUTHENTICATOR_VERIFY_LOCK_TTL = 10_000;

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

// Per-user cooldown between challenge-code emails (seconds). Bounds mail-capacity
// abuse — an authenticated caller cannot spray unlimited OTP mails. Separate from
// the verification backoff (which only tracks failed verifies, not sends).
export const USER_AUTHENTICATOR_EMAIL_SEND_CACHE_PREFIX = 'mfaEmailSend';
export const USER_AUTHENTICATOR_EMAIL_SEND_COOLDOWN = 60;

export const USER_AUTHENTICATOR_WEBAUTHN_REG_CACHE_PREFIX = 'mfaWebauthnReg';
export const USER_AUTHENTICATOR_WEBAUTHN_AUTH_CACHE_PREFIX = 'mfaWebauthnAuth';
export const USER_AUTHENTICATOR_WEBAUTHN_CHALLENGE_WINDOW = 300;
