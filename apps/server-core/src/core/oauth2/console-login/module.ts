/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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
