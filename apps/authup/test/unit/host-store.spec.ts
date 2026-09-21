/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import {
    createFileTokenStorage,
    createHostStore,
    resolveHostsDirectory,
} from '../../src/host/store/index.ts';
import type { HostsDocument } from '../../src/host/store/index.ts';
import { createHostsDirectory } from '../utils/host.ts';

const host = 'https://auth.example.com';

describe('host store', () => {
    let root : string;

    beforeEach(async () => {
        root = await createHostsDirectory();
    });

    afterEach(async () => {
        vi.unstubAllEnvs();
        await fs.rm(root, { recursive: true, force: true });
    });

    it('resolves the directory from XDG_CONFIG_HOME, else ~/.config', () => {
        expect(resolveHostsDirectory({ XDG_CONFIG_HOME: '/x' })).toEqual(path.join('/x', 'authup'));
        expect(resolveHostsDirectory({})).toMatch(/\.config[/\\]authup$/);
    });

    it('reads an empty document when the file does not exist', async () => {
        const store = createHostStore(resolveHostsDirectory());

        expect(await store.read()).toEqual({ hosts: {} });
    });

    it('round-trips a document as a private file in a private directory', async () => {
        const store = createHostStore(resolveHostsDirectory());
        const document : HostsDocument = {
            current: host,
            hosts: {
                [host]: {
                    clientId: 'cli',
                    realm: 'master',
                    storage: 'keychain',
                },
            },
        };

        await store.write(document);

        expect(await store.read()).toEqual(document);

        const file = path.join(store.directory, 'hosts.json');
        expect((await fs.stat(file)).mode & 0o777).toBe(0o600);
        expect((await fs.stat(store.directory)).mode & 0o777).toBe(0o700);
        expect(await fs.readdir(store.directory)).toEqual(['hosts.json']);
    });

    it('refuses a malformed document without echoing it', async () => {
        const store = createHostStore(resolveHostsDirectory());
        await fs.mkdir(store.directory, { recursive: true });
        await fs.writeFile(path.join(store.directory, 'hosts.json'), '{"hosts":{"https://a.test":{"storage":"vault","accessToken":"secret-token"}}}');

        await expect(store.read()).rejects.toThrow(/hosts file .* is invalid/);
        await expect(store.read()).rejects.not.toThrow(/secret-token/);
    });

    it('refuses a file that is not JSON', async () => {
        const store = createHostStore(resolveHostsDirectory());
        await fs.mkdir(store.directory, { recursive: true });
        await fs.writeFile(path.join(store.directory, 'hosts.json'), 'nope');

        await expect(store.read()).rejects.toThrow(/not valid JSON/);
    });

    describe('file token storage', () => {
        it('keeps the tokens on the host entry and strips them on remove', async () => {
            const store = createHostStore(resolveHostsDirectory());
            await store.write({ hosts: { [host]: { clientId: 'cli', storage: 'file' } } });
            const storage = createFileTokenStorage(store);

            expect(await storage.read(host)).toBeUndefined();

            await storage.write(host, {
                accessToken: 'a',
                refreshToken: 'r',
                expiresAt: 1000,
            });

            expect(await storage.read(host)).toEqual({
                accessToken: 'a',
                refreshToken: 'r',
                expiresAt: 1000,
            });
            expect((await store.read()).hosts[host]).toEqual({
                clientId: 'cli',
                storage: 'file',
                accessToken: 'a',
                refreshToken: 'r',
                expiresAt: 1000,
            });

            await storage.remove(host);

            expect(await storage.read(host)).toBeUndefined();
            expect((await store.read()).hosts[host]).toEqual({ clientId: 'cli', storage: 'file' });
        });

        it('refuses to write tokens for a host that has no entry', async () => {
            const store = createHostStore(resolveHostsDirectory());
            const storage = createFileTokenStorage(store);

            await expect(storage.write(host, { accessToken: 'a', expiresAt: 1 })).rejects.toThrow(/No entry for/);
        });
    });
});
