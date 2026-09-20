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

const keyring = vi.hoisted(() => {
    const entries = new Map<string, string>();
    let failing = false;

    class AsyncEntry {
        account : string;

        constructor(_service: string, account: string) {
            this.account = account;
        }

        async getPassword() : Promise<string | undefined> {
            return entries.get(this.account);
        }

        async setPassword(value: string) : Promise<void> {
            entries.set(this.account, value);
        }

        async deleteCredential() : Promise<boolean> {
            if (failing) throw new Error('keychain locked');
            return entries.delete(this.account);
        }
    }

    return {
        entries,
        AsyncEntry,
        fail: (value: boolean) => { failing = value; },
    };
});

vi.mock('@napi-rs/keyring', () => ({ AsyncEntry: keyring.AsyncEntry }));

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
        keyring.fail(false);
        keyring.entries.clear();
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

    it('forgets the host when the keychain refuses to remove the entry', async () => {
        await createHostStore(resolveHostsDirectory()).write({
            current: host,
            hosts: { [host]: { clientId: 'cli', storage: 'keychain' } },
        });
        keyring.entries.set(host, JSON.stringify({
            accessToken: 'secret-access',
            refreshToken: 'secret-refresh',
            expiresAt: 5,
        }));
        keyring.fail(true);
        const transport = createHostTransport({ 'POST /token/revoke': () => ({ status: 200, body: {} }) });

        await runCommand(defineCLILogoutCommand({ transport }), { rawArgs: [] });

        expect(await createHostStore(resolveHostsDirectory()).read()).toEqual({ hosts: {} });
        expect(notices.join('')).toContain('Could not remove the keychain entry');
    });
});
