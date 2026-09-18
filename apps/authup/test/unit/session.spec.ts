/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */



import { runCommand } from 'citty';
import { FetchTransport, MemoryTransport } from 'hapic';
import { defineCLIAPICommand, defineCLILoginCommand } from '../../src/commands/index.ts';
import { AsyncEntry } from '@napi-rs/keyring';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { readSession, saveSession, withSession } from '../../src/remote/session/index.ts';

vi.mock('@napi-rs/keyring', () => {
    const entries = new Map<string, string>();
    return {
        AsyncEntry: class {
            key: string;
            constructor(service: string, account: string, options: unknown) {
                expect(service).toBe('authup');
                expect(options).toEqual({ linux: { store: 'secret-service' } });
                this.key = account;
            }
            async getPassword() { return entries.get(this.key); }
            async setPassword(value: string) { entries.set(this.key, value); }
            async deleteCredential() { return entries.delete(this.key); }
        },
    };
});

const server = 'https://auth.example.test/';
const session = {
    server,
    clientId: 'client-id',
    accessToken: 'secret-access',
    refreshToken: 'secret-refresh',
    expiresAt: 100000,
};

describe('CLI credential storage', () => {
    let directory: string;
    beforeEach(async () => {
        directory = await fs.mkdtemp(path.join(os.tmpdir(), 'authup-cli-session-'));
        vi.stubEnv('XDG_CONFIG_HOME', directory);
        vi.stubEnv('AUTHUP_CREDENTIAL_STORE', '');
        vi.stubEnv('AUTHUP_SERVER_URL', server);
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(async () => {
        vi.restoreAllMocks();
        await withSession(server, undefined, (store) => store.remove());
        vi.unstubAllEnvs();
        await fs.rm(directory, { recursive: true, force: true });
    });

    it('defaults to persistent keychain storage and leaves no token file', async () => {
        await withSession(server, undefined, async (store) => {
            await saveSession(store, session);
            expect(await readSession(store, server)).toEqual(session);
        });
        expect(await fs.readdir(path.join(directory, 'authup', 'credentials'))).toEqual([]);
        await withSession('https://other.example.test/', undefined, async (store) => {
            await expect(readSession(store, 'https://other.example.test/')).rejects.toThrow(/login/);
        });
        await withSession(server, undefined, (store) => store.remove());
        await withSession(server, undefined, async (store) => {
            await expect(readSession(store, server)).rejects.toThrow(/login/);
        });
    });

    it('does not fall back or expose native errors when the keychain is locked', async () => {
        vi.spyOn(AsyncEntry.prototype, 'getPassword').mockRejectedValueOnce(new Error('secret-refresh'));
        await expect(withSession(server, undefined, (store) => readSession(store, server)))
            .rejects.toThrow('Could not access the OS keychain. Unlock it or explicitly select --credential-store=file.');
        expect(await fs.readdir(path.join(directory, 'authup', 'credentials'))).toEqual([]);
    });

    it('supports explicit file fallback without touching the keychain', async () => {
        const keychain = vi.spyOn(AsyncEntry.prototype, 'setPassword');
        await withSession(server, 'file', async (store) => {
            await saveSession(store, session);
            expect(await readSession(store, server)).toEqual(session);
            await store.remove();
        });
        expect(keychain).not.toHaveBeenCalled();
    });

    it('propagates keychain write and deletion failures without clearing credentials', async () => {
        await withSession(server, undefined, (store) => saveSession(store, session));
        vi.spyOn(AsyncEntry.prototype, 'setPassword').mockRejectedValueOnce(new Error('secret-refresh'));
        await expect(withSession(server, undefined, (store) => saveSession(store, session))).rejects.toThrow(/keychain/);
        vi.spyOn(AsyncEntry.prototype, 'deleteCredential').mockRejectedValueOnce(new Error('secret-refresh'));
        await expect(withSession(server, undefined, (store) => store.remove())).rejects.toThrow(/keychain/);
        await withSession(server, undefined, async (store) => expect(await readSession(store, server)).toEqual(session));
    });

    it('rejects an unknown credential store before creating files', async () => {
        await expect(withSession(server, 'bogus', async () => {})).rejects.toThrow(/credential-store/);
        expect(await fs.readdir(directory)).toEqual([]);
    });
    it('does not send a mutation if persisting a rotated grant to the keychain fails', async () => {
        const replies = [
            {
                device_code: 'device-secret',
                user_code: 'BCDF-GHJK',
                verification_uri_complete: `${server}device`,
                interval: 0.001,
                expires_in: 600,
            },
            {
                access_token: 'old-access',
                refresh_token: 'old-refresh',
                expires_in: 0,
                token_type: 'Bearer',
            },
            {
                access_token: 'new-access',
                refresh_token: 'new-refresh',
                expires_in: 60,
                token_type: 'Bearer',
            },
        ];
        const transport = new MemoryTransport({ fetch: () => ({ body: replies.shift() }) });
        vi.spyOn(FetchTransport.prototype, 'dispatch').mockImplementation((request) => transport.dispatch(request));
        await runCommand(defineCLILoginCommand(), { rawArgs: ['--client-id', 'client-id'] });
        vi.spyOn(AsyncEntry.prototype, 'setPassword').mockRejectedValueOnce(new Error('new-refresh'));
        await expect(runCommand(defineCLIAPICommand(), { rawArgs: ['users/1', '--method', 'DELETE'] })).rejects.toThrow(/keychain/);
        expect(transport.requests).toHaveLength(3);
        expect(new URL(transport.requests[2].url).pathname).toBe('/token');
        expect(await fs.readdir(path.join(directory, 'authup', 'credentials'))).toEqual([]);
    });
    it('finishes persisting a rotated grant under the lock even when interrupted', async () => {
        let finish: () => void = () => {};
        const original = AsyncEntry.prototype.setPassword;
        const write = vi.spyOn(AsyncEntry.prototype, 'setPassword').mockImplementationOnce(async function (this: AsyncEntry, value, signal) {
            await new Promise<void>((resolve, reject) => {
                finish = resolve;
                signal?.addEventListener('abort', () => reject(new Error('Write cancelled')), { once: true });
            });
            await original.call(this, value);
        });
        const saving = withSession(server, undefined, (store) => saveSession(store, session))
            .catch((error: unknown) => error);
        try {
            await vi.waitFor(() => expect(write).toHaveBeenCalled());
            process.emit('SIGINT');
            await expect(withSession(server, undefined, async () => {})).rejects.toThrow(/Another CLI command/);
        } finally {
            finish();
            expect(await saving).toBeUndefined();
        }
        await withSession(server, undefined, async (store) => expect(await readSession(store, server)).toEqual(session));
    });
});
