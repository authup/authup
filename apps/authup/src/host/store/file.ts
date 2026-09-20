/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IHostStore, IHostTokenStorage } from './types.ts';

export function createFileTokenStorage(store: IHostStore) : IHostTokenStorage {
    return {
        async read(host) {
            const entry = (await store.read()).hosts[host];
            if (!entry || !entry.accessToken || entry.expiresAt === undefined) {
                return undefined;
            }

            return {
                accessToken: entry.accessToken,
                refreshToken: entry.refreshToken,
                expiresAt: entry.expiresAt,
            };
        },
        async write(host, tokens) {
            const document = await store.read();
            const entry = document.hosts[host];
            if (!entry) {
                throw new Error(`No entry for ${host} to keep the tokens on.`);
            }

            document.hosts[host] = { ...entry, ...tokens };

            await store.write(document);
        },
        async remove(host) {
            const document = await store.read();
            const entry = document.hosts[host];
            if (!entry) {
                return;
            }

            /* eslint-disable @typescript-eslint/no-unused-vars */
            const {
                accessToken,
                refreshToken,
                expiresAt,
                ...rest
            } = entry;
            /* eslint-enable @typescript-eslint/no-unused-vars */

            document.hosts[host] = rest;

            await store.write(document);
        },
    };
}
