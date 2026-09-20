/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AsyncEntry } from '@napi-rs/keyring';
import type * as KeyringModule from '@napi-rs/keyring';
import { KEYCHAIN_SERVICE_NAME } from '../constants.ts';
import { parseHostTokens } from './module.ts';
import type { IHostTokenStorage } from './types.ts';

/**
 * The native error is never attached: its message can carry the secret.
 */
function keychainUnavailable() : Error {
    return new Error('The OS keychain is not available. Unlock it, or sign in with `authup login --insecure-storage` to keep the tokens in the hosts file.');
}

/**
 * Loaded on first use so a platform without a prebuilt binary still runs
 * every command that does not touch the keychain. Linux is pinned to
 * Secret Service: the default may pick the kernel keyutils store, which
 * does not survive the session.
 */
async function openEntry(host: string) : Promise<AsyncEntry> {
    try {
        const module : typeof KeyringModule = await import('@napi-rs/keyring');

        return new module.AsyncEntry(KEYCHAIN_SERVICE_NAME, host, { linux: { store: 'secret-service' } });
    } catch {
        throw keychainUnavailable();
    }
}

export function createKeychainTokenStorage() : IHostTokenStorage {
    return {
        async read(host) {
            const entry = await openEntry(host);
            const raw = await entry.getPassword().catch(() => {
                throw keychainUnavailable();
            });
            if (!raw) {
                return undefined;
            }

            return parseHostTokens(raw, 'keychain');
        },
        async write(host, tokens) {
            const entry = await openEntry(host);
            await entry.setPassword(JSON.stringify(tokens)).catch(() => {
                throw keychainUnavailable();
            });
        },
        async remove(host) {
            const entry = await openEntry(host);
            await entry.deleteCredential().catch(() => {
                throw keychainUnavailable();
            });
        },
    };
}
