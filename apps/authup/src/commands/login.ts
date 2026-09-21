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
    resolveHostURL,
    resolveHostsDirectory,
    runDeviceLogin,
    runHostCommand,
    selectTokenStorage,
    tokensFromGrant,
    withHostLock,
    writeNotice,
} from '../host/index.ts';
import type { HostCommandContext, HostEntry, HostStorage } from '../host/index.ts';

export function defineCLILoginCommand(context: HostCommandContext = {}) {
    return defineCommand({
        meta: {
            name: 'login',
            description: 'Sign in to an authup server through the device authorization grant.',
        },
        args: {
            ...HOST_ARGS,
            client: {
                type: 'string',
                description: 'The OAuth2 client the CLI presents: a UUID, or a name within --realm. Remembered per server.',
            },
            realm: {
                type: 'string',
                description: 'The realm a client name resolves in. Defaults to the master realm.',
            },
            scope: {
                type: 'string',
                description: 'Space-separated scopes to request. Defaults to every scope bound to the client.',
            },
            'insecure-storage': {
                type: 'boolean',
                description: 'Keep the tokens in the hosts file instead of the OS keychain.',
            },
        },
        run: ({ args }) => runHostCommand(async () => {
            const store = createHostStore(resolveHostsDirectory());
            const document = await store.read();
            const host = resolveHostURL(args.server, document.current);
            const previous = document.hosts[host];

            const clientId = args.client || previous?.clientId;
            if (!clientId) {
                throw new Error(`No client is remembered for ${host}. Pass --client <id|name>, and --realm for a name outside the master realm.`);
            }

            const clientChanged = !!args.client && args.client !== previous?.clientId;
            const realm = clientChanged ? args.realm : (args.realm || previous?.realm);
            const storage : HostStorage = args['insecure-storage'] ? 'file' : 'keychain';

            const grant = await runDeviceLogin(
                new Client({ baseURL: host, transport: context.transport }),
                {
                    clientId,
                    realm,
                    scope: args.scope,
                },
            );
            const tokens = tokensFromGrant(grant);

            await withHostLock(store.directory, async () => {
                if (previous && previous.storage !== storage) {
                    await selectTokenStorage(previous.storage, store).remove(host);
                }

                const latest = await store.read();
                const entry : HostEntry = {
                    clientId,
                    storage,
                    ...(realm ? { realm } : {}),
                };
                latest.hosts[host] = entry;
                latest.current = host;
                await store.write(latest);

                await selectTokenStorage(storage, store).write(host, tokens);
            });

            writeNotice(`Signed in to ${host}.`);
        }),
    });
}
