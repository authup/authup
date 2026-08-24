/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createHash } from 'node:crypto';
import { createNanoID } from '@authup/kit';
import { CONSOLE_SESSION_SECRET_LENGTH } from './constants.ts';

/**
 * Mint the opaque credential a console browser presents (plan 088). It is
 * written to `auth_sessions.secret` (a `select: false` column resolved only by
 * `ISessionRepository.findOneBySecret`) and handed to the browser in the
 * console session cookie.
 */
export function createConsoleSessionSecret() : string {
    return createNanoID(CONSOLE_SESSION_SECRET_LENGTH);
}

/**
 * The value actually stored in `auth_sessions.secret`.
 *
 * `select: false` limits what the ORM projects; it does nothing about what the
 * database CONTAINS, so storing the credential verbatim would make any read of
 * that table — a leaked backup, a read replica, a SQL injection that only
 * SELECTs — a source of replayable `authup_console_session` cookies. The
 * column holds a digest instead, and the cookie value never lands anywhere it
 * can be read back.
 *
 * A plain SHA-256 rather than a keyed HMAC, deliberately. Keying defends a
 * LOW-entropy input against offline guessing, which is why a password needs
 * bcrypt; this input is 48 nanoid characters over a 36-symbol alphabet (~248
 * bits), so there is no guessing attack for a key to frustrate. A keyed scheme
 * would also have to be GLOBAL — the lookup resolves a session BY this value,
 * so the realm is unknown at that point and a per-realm key is unavailable —
 * and the only global key (`SECRETS_ENCRYPTION_KEY`) is optional, so keying
 * would either be absent by default or need key management of its own.
 *
 * Deterministic, so the lookup stays a single indexed equality. Hex SHA-256 is
 * exactly 64 characters, which is the column's width.
 */
export function hashConsoleSessionSecret(secret: string) : string {
    return createHash('sha256').update(secret).digest('hex');
}
