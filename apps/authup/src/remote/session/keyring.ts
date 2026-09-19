/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SessionStore } from './types.ts';

function keychainError() : never {
    // Native errors can contain credentials. Never attach them as a cause.
    throw new Error('Could not access the OS keychain. Unlock it or explicitly select --credential-store=file.');
}

export async function createKeychainStore(server: string, signal: AbortSignal) : Promise<SessionStore> {
    try {
        // Optional and lazy: a missing native binary must not prevent server commands or file storage.
        const { AsyncEntry } = await import('@napi-rs/keyring');
        const entry = new AsyncEntry('authup', server, { linux: { store: 'secret-service' } });
        return {
            read: () => entry.getPassword(signal).catch(keychainError),
            // A completed token rotation must be persisted even if the command is interrupted.
            write: (value) => entry.setPassword(value).catch(keychainError),
            async remove() {
                await entry.deleteCredential(signal).catch(keychainError);
            },
        };
    } catch {
        return keychainError();
    }
}
