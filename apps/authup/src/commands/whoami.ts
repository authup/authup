/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import {
    HOST_ARGS,
    openHost,
    runHostCommand,
    writeOutput,
} from '../host/index.ts';
import type { HostCommandContext } from '../host/index.ts';

function describeExpiry(expiresAt: number, now = Date.now()) : string {
    const seconds = Math.round((expiresAt - now) / 1000);
    if (seconds <= 0) {
        return 'expired';
    }

    if (seconds < 120) {
        return `expires in ${seconds} seconds`;
    }

    return `expires in ${Math.round(seconds / 60)} minutes`;
}

export function defineCLIWhoamiCommand(context: HostCommandContext = {}) {
    return defineCommand({
        meta: {
            name: 'whoami',
            description: 'Show who is signed in to a server.',
        },
        args: HOST_ARGS,
        run: ({ args }) => runHostCommand(async () => {
            const opened = await openHost(args.server, context);

            const session = await opened.client.account.getSession();
            if (!session.active) {
                throw new Error(`The sign-in to ${opened.host} is no longer active. Run \`authup login\` again.`);
            }

            // the request above may have rotated the tokens
            const tokens = await opened.storage.read(opened.host) ?? opened.tokens;
            const kept = opened.entry.storage === 'keychain' ? 'keychain' : 'hosts file';

            writeOutput(`${session.name ?? session.sub} (${session.sub_kind}) in realm ${session.realm_name} on ${opened.host}`);
            writeOutput(`client ${opened.entry.clientId}, tokens in the ${kept}, access token ${describeExpiry(tokens.expiresAt)}`);
        }),
    });
}
