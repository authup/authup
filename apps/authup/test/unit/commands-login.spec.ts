/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { runCommand } from 'citty';
import fs from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { defineCLILoginCommand } from '../../src/commands/login.ts';
import { createHostStore, resolveHostsDirectory } from '../../src/host/store/index.ts';
import { createHostTransport, createHostsDirectory } from '../utils/host.ts';

vi.mock('node:timers/promises', () => ({ setTimeout: vi.fn(async () => undefined) }));

const keyring = vi.hoisted(() => {
    const entries = new Map<string, string>();

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
            return entries.delete(this.account);
        }
    }

    return { entries, AsyncEntry };
});

vi.mock('@napi-rs/keyring', () => ({ AsyncEntry: keyring.AsyncEntry }));

const host = 'https://auth.example.com';

const device = {
    device_code: 'secret-device',
    user_code: 'BCDF-GHJK',
    verification_uri: `${host}/device`,
    verification_uri_complete: `${host}/device?user_code=BCDF-GHJK`,
    expires_in: 600,
    interval: 5,
};

const grant = {
    access_token: 'secret-access',
    refresh_token: 'secret-refresh',
    expires_in: 900,
    token_type: 'Bearer',
};

describe('authup login', () => {
    let root : string;
    let forms : Record<string, string>[];
    let notices : string[];

    beforeEach(async () => {
        root = await createHostsDirectory();
        vi.stubEnv('AUTHUP_SERVER_URL', '');
        forms = [];
        notices = [];
        vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
            notices.push(String(chunk));
            return true;
        });
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
        vi.mocked(setTimeout).mockClear();
        keyring.entries.clear();
        await fs.rm(root, { recursive: true, force: true });
    });

    function login(rawArgs: string[]) {
        const transport = createHostTransport({
            'POST /device_authorization': (_request, form) => {
                forms.push(form);
                return { body: device };
            },
            'POST /token': (_request, form) => {
                forms.push(form);
                return { body: grant };
            },
        });

        return runCommand(defineCLILoginCommand({ transport }), { rawArgs });
    }

    it('signs in with a named client in a realm, keeps the tokens in the keychain and makes the host current', async () => {
        await login(['--server', `${host}/`, '--client', 'cli', '--realm', 'master', '--scope', 'global openid']);

        expect(forms[0]).toEqual({
            client_id: 'cli', 
            realm_name: 'master', 
            scope: 'global openid', 
        });
        expect(await createHostStore(resolveHostsDirectory()).read()).toEqual({
            current: host,
            hosts: {
                [host]: {
                    clientId: 'cli', 
                    realm: 'master', 
                    storage: 'keychain', 
                }, 
            },
        });
        expect(JSON.parse(keyring.entries.get(host)!)).toMatchObject({ accessToken: 'secret-access', refreshToken: 'secret-refresh' });
        expect(notices.join('')).toContain(`Signed in to ${host}`);
        expect(notices.join('')).not.toContain('secret-');
    });

    it('reuses the remembered client and realm on a bare login to the current host', async () => {
        await login(['--server', host, '--client', 'cli', '--realm', 'master']);
        forms.length = 0;

        await login([]);

        expect(forms[0]).toEqual({ client_id: 'cli', realm_name: 'master' });
    });

    it('keeps the remembered realm when the same client is passed again', async () => {
        await login(['--server', host, '--client', 'cli', '--realm', 'master']);
        forms.length = 0;

        await login(['--client', 'cli']);

        expect(forms[0]).toEqual({ client_id: 'cli', realm_name: 'master' });
    });

    it('keeps the tokens in the hosts file on --insecure-storage and drops the keychain entry', async () => {
        await login(['--server', host, '--client', 'cli']);
        expect(keyring.entries.has(host)).toBe(true);

        await login(['--server', host, '--insecure-storage']);

        expect(keyring.entries.has(host)).toBe(false);
        expect((await createHostStore(resolveHostsDirectory()).read()).hosts[host]).toMatchObject({
            clientId: 'cli', 
            storage: 'file', 
            accessToken: 'secret-access', 
            refreshToken: 'secret-refresh',
        });
    });

    it('refuses a first login without a client', async () => {
        await expect(login(['--server', host])).rejects.toThrow(/No client is remembered/);
        expect(forms).toEqual([]);
    });

    it('refuses plain http for a remote host', async () => {
        await expect(login(['--server', 'http://auth.example.com', '--client', 'cli'])).rejects.toThrow(/Use https/);
    });

    it('refuses when nothing names a server', async () => {
        await expect(login(['--client', 'cli'])).rejects.toThrow(/No server given/);
    });
});
