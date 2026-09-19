/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import { REMOTE_ARGS, readServer } from '../remote/args.ts';
import { withSession } from '../remote/session/index.ts';

export function defineCLILogoutCommand() {
    return defineCommand({
        meta: { name: 'logout', description: 'Remove the saved local login for a server.' },
        args: REMOTE_ARGS,
        async run({ args }) {
            if (args._.length > 0) throw new Error('Usage: authup logout [--server <url>]');
            const server = readServer(args.server);
            await withSession(server, args['credential-store'], (store) => store.remove());
            // eslint-disable-next-line no-console
            console.error(`Removed the local login for ${server}`);
        },
    });
}
