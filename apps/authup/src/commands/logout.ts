/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '@authup/core-http-kit';
import { defineCommand } from 'citty';
import {
    HOST_ARGS,
    createHostStore,
    describeHostError,
    resolveHostURL,
    resolveHostsDirectory,
    runHostCommand,
    selectTokenStorage,
    withHostLock,
    writeNotice,
} from '../host/index.ts';
import type { HostCommandContext } from '../host/index.ts';

/**
 * Revocation retires the CLI's two tokens and nothing else. The device
 * grant's tokens ride the approving browser's session row, so ending the
 * session (DELETE /sessions/@me) would sign that browser out as well.
 */
export function defineCLILogoutCommand(context: HostCommandContext = {}) {
    return defineCommand({
        meta: {
            name: 'logout',
            description: 'Revoke the tokens of a sign-in and forget it.',
        },
        args: HOST_ARGS,
        run: ({ args }) => runHostCommand(async () => {
            const store = createHostStore(resolveHostsDirectory());
            const document = await store.read();
            const host = resolveHostURL(args.server, document.current);

            const entry = document.hosts[host];
            if (!entry) {
                throw new Error(`Not signed in to ${host}.`);
            }

            const storage = selectTokenStorage(entry.storage, store);
            const tokens = await storage.read(host);
            if (tokens) {
                const client = new Client({ baseURL: host, transport: context.transport });
                const revocations : [string | undefined, 'refresh_token' | 'access_token'][] = [
                    [tokens.refreshToken, 'refresh_token'],
                    [tokens.accessToken, 'access_token'],
                ];

                for (const [token, hint] of revocations) {
                    if (!token) {
                        continue;
                    }

                    try {
                        await client.token.revoke({ token, token_type_hint: hint });
                    } catch (e) {
                        writeNotice(`Could not revoke the ${hint.replace('_', ' ')} at ${host}: ${describeHostError(e)}`);
                    }
                }
            }

            await withHostLock(store.directory, async () => {
                try {
                    await storage.remove(host);
                } catch {
                    writeNotice(`Could not remove the keychain entry for ${host}; remove it by hand (service authup). The tokens are revoked and the host is forgotten.`);
                }

                const latest = await store.read();
                delete latest.hosts[host];
                if (latest.current === host) {
                    delete latest.current;
                }

                await store.write(latest);
            });

            writeNotice(`Signed out of ${host}.`);
        }),
    });
}
