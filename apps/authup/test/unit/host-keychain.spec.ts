/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { createHostStore, createKeychainTokenStorage, selectTokenStorage } from '../../src/host/store/index.ts';

const keyring = vi.hoisted(() => {
    const entries = new Map<string, string>();
    const constructed : {
        service: string,
        account: string,
        options: unknown
    }[] = [];
    let failing = false;

    class AsyncEntry {
        account : string;

        constructor(service: string, account: string, options: unknown) {
            constructed.push({
                service,
                account,
                options,
            });
            this.account = account;
        }

        async getPassword() : Promise<string | undefined> {
            if (failing) throw new Error('keychain locked, secret leaked in message');
            return entries.get(this.account);
        }

        async setPassword(value: string) : Promise<void> {
            if (failing) throw new Error('keychain locked, secret leaked in message');
            entries.set(this.account, value);
        }

        async deleteCredential() : Promise<boolean> {
            if (failing) throw new Error('keychain locked, secret leaked in message');
            return entries.delete(this.account);
        }
    }

    return {
        entries,
        constructed,
        AsyncEntry,
        fail: (value: boolean) => { failing = value; },
    };
});

vi.mock('@napi-rs/keyring', () => ({ AsyncEntry: keyring.AsyncEntry }));

const host = 'https://auth.example.com';

describe('keychain token storage', () => {
    afterEach(() => {
        keyring.entries.clear();
        keyring.constructed.length = 0;
        keyring.fail(false);
    });

    it('stores the tokens under the authup service, keyed by host, pinned to Secret Service on linux', async () => {
        const storage = createKeychainTokenStorage();

        expect(await storage.read(host)).toBeUndefined();

        await storage.write(host, {
            accessToken: 'a',
            refreshToken: 'r',
            expiresAt: 1000,
        });

        expect(keyring.constructed[0]).toEqual({
            service: 'authup',
            account: host,
            options: { linux: { store: 'secret-service' } },
        });
        expect(JSON.parse(keyring.entries.get(host)!)).toEqual({
            accessToken: 'a',
            refreshToken: 'r',
            expiresAt: 1000,
        });
        expect(await storage.read(host)).toEqual({
            accessToken: 'a',
            refreshToken: 'r',
            expiresAt: 1000,
        });

        await storage.remove(host);

        expect(await storage.read(host)).toBeUndefined();
    });

    it('turns a keychain failure into one message naming the opt-out, without the native text', async () => {
        const storage = createKeychainTokenStorage();
        keyring.fail(true);

        await expect(storage.read(host)).rejects.toThrow(/--insecure-storage/);
        await expect(storage.read(host)).rejects.not.toThrow(/leaked/);
        await expect(storage.write(host, { accessToken: 'a', expiresAt: 1 })).rejects.toThrow(/--insecure-storage/);
        await expect(storage.remove(host)).rejects.toThrow(/--insecure-storage/);
    });

    it('refuses an entry it cannot read as tokens', async () => {
        const storage = createKeychainTokenStorage();
        keyring.entries.set(host, '{"accessToken":""}');

        await expect(storage.read(host)).rejects.toThrow(/not readable/);
    });

    it('selects the storage the entry names', () => {
        const store = createHostStore('/tmp/unused');

        expect(selectTokenStorage('keychain', store)).toBe(selectTokenStorage('keychain', store));
        expect(selectTokenStorage('file', store)).not.toBe(selectTokenStorage('keychain', store));
    });
});
