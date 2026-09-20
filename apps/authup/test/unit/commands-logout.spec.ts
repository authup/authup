/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { runCommand } from 'citty';
import fs from 'node:fs/promises';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { defineCLILogoutCommand } from '../../src/commands/logout.ts';
import { createHostStore, resolveHostsDirectory } from '../../src/host/store/index.ts';
import { createHostTransport, createHostsDirectory } from '../utils/host.ts';

const host = 'https://auth.example.com';

describe('authup logout', () => {
    let root : string;
    let notices : string[];

    beforeEach(async () => {
        root = await createHostsDirectory();
        vi.stubEnv('AUTHUP_SERVER_URL', '');
        notices = [];
        vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
            notices.push(String(chunk));
            return true;
        });
        await createHostStore(resolveHostsDirectory()).write({
            current: host,
            hosts: {
                [host]: {
                    clientId: 'cli', 
                    storage: 'file', 
                    accessToken: 'secret-access', 
                    refreshToken: 'secret-refresh', 
                    expiresAt: 5,
                },
            },
        });
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
        await fs.rm(root, { recursive: true, force: true });
    });

    it('revokes both tokens, removes the entry and clears the current host', async () => {
        const revoked : Record<string, string>[] = [];
        const transport = createHostTransport({
            'POST /token/revoke': (_request, form) => {
                revoked.push(form);
                return { status: 200, body: {} };
            },
        });

        await runCommand(defineCLILogoutCommand({ transport }), { rawArgs: [] });

        expect(revoked).toEqual([
            { token: 'secret-refresh', token_type_hint: 'refresh_token' },
            { token: 'secret-access', token_type_hint: 'access_token' },
        ]);
        expect(await createHostStore(resolveHostsDirectory()).read()).toEqual({ hosts: {} });
        expect(notices.join('')).toContain(`Signed out of ${host}`);
    });

    it('signs out locally when the revocation fails, and says so', async () => {
        const transport = createHostTransport({
            'POST /token/revoke': () => ({
                status: 503,
                body: {
                    code: 'internal_error', 
                    message: 'down', 
                    '@instanceof': ['@ebec/core/BaseError', '@authup/errors/AuthupError'], 
                }, 
            }), 
        });

        await runCommand(defineCLILogoutCommand({ transport }), { rawArgs: [] });

        expect(await createHostStore(resolveHostsDirectory()).read()).toEqual({ hosts: {} });
        expect(notices.join('')).toContain('Could not revoke the refresh token');
        expect(notices.join('')).not.toContain('secret-');
    });

    it('refuses a host without a sign-in', async () => {
        await expect(runCommand(defineCLILogoutCommand(), { rawArgs: ['--server', 'https://other.test'] }))
            .rejects.toThrow(/Not signed in to https:\/\/other.test/);
    });
});
