/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { normalizeServer } from './url.ts';

export const REMOTE_ARGS = {
    server: {
        type: 'string',
        description: 'API base URL (defaults to AUTHUP_SERVER_URL, then http://localhost:3000/).',
    },
    'credential-store': {
        type: 'string',
        description: 'keychain (default) or file; also configurable through AUTHUP_CREDENTIAL_STORE.',
    },
} as const;

export function readServer(server?: string) : string {
    return normalizeServer(server || process.env.AUTHUP_SERVER_URL || 'http://localhost:3000/');
}
