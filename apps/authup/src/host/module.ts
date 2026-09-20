/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { resolveHostURL } from './args.ts';
import { createHostClient } from './client.ts';
import { createHostStore, resolveHostsDirectory, selectTokenStorage } from './store/index.ts';
import type { HostCommandContext, OpenedHost } from './types.ts';

export async function openHost(server: string | undefined, context: HostCommandContext = {}) : Promise<OpenedHost> {
    const store = createHostStore(resolveHostsDirectory());
    const document = await store.read();
    const host = resolveHostURL(server, document.current);

    const entry = document.hosts[host];
    if (!entry) {
        throw new Error(`Not signed in to ${host}. Run \`authup login --server ${host} --client <id|name>\`.`);
    }

    const storage = selectTokenStorage(entry.storage, store);
    const tokens = await storage.read(host);
    if (!tokens) {
        throw new Error(`The tokens for ${host} are gone. Run \`authup login\` again.`);
    }

    return {
        host,
        entry,
        tokens,
        storage,
        store,
        client: createHostClient({
            host,
            entry,
            tokens,
            storage,
            directory: store.directory,
            transport: context.transport,
        }),
    };
}
