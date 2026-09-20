/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { runCommand } from 'citty';
import fs from 'node:fs/promises';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { defineCLIWhoamiCommand } from '../../src/commands/whoami.ts';
import { createHostStore, resolveHostsDirectory } from '../../src/host/store/index.ts';
import { createHostTransport, createHostsDirectory } from '../utils/host.ts';

const host = 'https://auth.example.com';

describe('authup whoami', () => {
    let root : string;
    let output : string[];

    beforeEach(async () => {
        root = await createHostsDirectory();
        vi.stubEnv('AUTHUP_SERVER_URL', '');
        output = [];
        vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
            output.push(String(chunk));
            return true;
        });
        vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
        await createHostStore(resolveHostsDirectory()).write({
            current: host,
            hosts: {
                [host]: {
                    clientId: 'cli', 
                    storage: 'file', 
                    accessToken: 'secret-access', 
                    refreshToken: 'secret-refresh', 
                    expiresAt: 1_000_000 + 12 * 60_000,
                },
            },
        });
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
        await fs.rm(root, { recursive: true, force: true });
    });

    it('prints who is signed in, where, and how the tokens are kept', async () => {
        const transport = createHostTransport({
            'GET /sessions/@me/introspect': () => ({
                body: {
                    active: true, 
                    sub: 'u1', 
                    sub_kind: 'user', 
                    realm_name: 'master', 
                    name: 'alice',
                },
            }),
        });

        await runCommand(defineCLIWhoamiCommand({ transport }), { rawArgs: [] });

        expect(output.join('')).toEqual([
            `alice (user) in realm master on ${host}`,
            'client cli, tokens in the hosts file, access token expires in 12 minutes',
            '',
        ].join('\n'));
    });

    it('asks for a new sign-in when the server reports the sign-in inactive', async () => {
        const transport = createHostTransport({ 'GET /sessions/@me/introspect': () => ({ body: { active: false } }) });

        await expect(runCommand(defineCLIWhoamiCommand({ transport }), { rawArgs: [] }))
            .rejects.toThrow(/no longer active/);
    });
});
