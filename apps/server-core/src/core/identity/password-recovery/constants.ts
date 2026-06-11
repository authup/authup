/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Validity window of a password-reset code. Drives both the persisted
 * `reset_expires` timestamp and the expiry note in the reset mail.
 */
export const PASSWORD_RESET_EXPIRES_IN_MINUTES = 30;
