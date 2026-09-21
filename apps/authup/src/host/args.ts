/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ArgsDef } from 'citty';
import process from 'node:process';
import { normalizeHostURL } from './url.ts';

export const HOST_ARGS = {
    server: {
        type: 'string',
        description: 'The API base URL. Defaults to AUTHUP_SERVER_URL, then to the server of the last login.',
    },
} satisfies ArgsDef;

export function resolveHostURL(
    server: string | undefined,
    current: string | undefined,
    env: NodeJS.ProcessEnv = process.env,
) : string {
    const input = server || env.AUTHUP_SERVER_URL || current;
    if (!input) {
        throw new Error('No server given. Pass --server <url>, set AUTHUP_SERVER_URL, or sign in once with `authup login --server <url> --client <id|name>`.');
    }

    return normalizeHostURL(input);
}
