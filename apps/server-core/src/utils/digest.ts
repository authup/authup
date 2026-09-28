/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createHash } from 'node:crypto';

/**
 * The hex SHA-256 digest stored in place of a high-entropy secret (a session
 * credential, a mailed one-time code), so a read of the table yields nothing
 * that can be presented. Unkeyed on purpose: there is no guessing attack on
 * such an input for a key to frustrate, and the lookup stays one indexed
 * equality.
 */
export function digestSHA256(value: string) : string {
    return createHash('sha256').update(value).digest('hex');
}
