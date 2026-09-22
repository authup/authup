/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createURLCodec } from '@rapiq/codec-url';
import { runCommand } from 'citty';
import type { CommandDef } from 'citty';
import { MemoryTransport } from 'hapic';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { defineCLIEntityCommands, readEntityData, readEntityQuery } from '../../src/commands/entity/index.ts';
import { createHostStore, resolveHostsDirectory } from '../../src/host/store/index.ts';
import { createHostTransport, createHostsDirectory } from '../utils/host.ts';
import type { HostRoute } from '../utils/host.ts';

const host = 'https://auth.example.com';

const NOUNS = [
    'client',
    'client-permission',
    'client-role',
    'client-scope',
    'consent',
    'event',
    'identity-provider',
    'identity-provider-account',
    'identity-provider-role-mapping',
    'key',
    'path',
    'permission',
    'permission-policy',
    'policy',
    'realm',
    'role',
    'role-attribute',
    'role-permission',
    'scope',
    'session',
    'session-token',
    'trust-anchor',
    'user',
    'user-attribute',
    'user-permission',
    'user-role',
];

function verbsOf(command: CommandDef) : string[] {
    return Object.keys(command.subCommands as Record<string, CommandDef>).sort();
}

describe('entity commands', () => {
    it('derives one noun per entity the client serves, in kebab-case', () => {
        expect(Object.keys(defineCLIEntityCommands()).sort()).toEqual(NOUNS);
    });

    it('does not derive a command for the nested user-authenticator API', () => {
        expect(defineCLIEntityCommands()['user-authenticator']).toBeUndefined();
    });

    it('derives the verbs from the dispatch', () => {
        const commands = defineCLIEntityCommands();

        expect(verbsOf(commands.user!)).toEqual(['create', 'delete', 'get', 'list', 'update']);
        expect(verbsOf(commands.session!)).toEqual(['delete', 'get', 'list']);
        expect(verbsOf(commands['user-role']!)).toEqual(['create', 'delete', 'get', 'list']);
    });

    describe('against a host', () => {
        let root : string;
        let output : string[];
        let requests : {
            method: string,
            url: string,
            body?: unknown
        }[];

        beforeEach(async () => {
            root = await createHostsDirectory();
            vi.stubEnv('AUTHUP_SERVER_URL', '');
            output = [];
            requests = [];
            vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
                output.push(String(chunk));
                return true;
            });
            await createHostStore(resolveHostsDirectory()).write({
                current: host,
                hosts: {
                    [host]: {
                        clientId: 'cli',
                        storage: 'file',
                        accessToken: 'a',
                        refreshToken: 'r',
                        expiresAt: Date.now() + 900_000,
                    },
                },
            });
        });

        afterEach(async () => {
            vi.restoreAllMocks();
            vi.unstubAllEnvs();
            await fs.rm(root, { recursive: true, force: true });
        });

        function run(noun: string, rawArgs: string[], routes: Record<string, HostRoute>) {
            const record : HostRoute = (request, form) => {
                requests.push({
                    method: (request.method ?? 'GET').toUpperCase(),
                    url: request.url,
                    body: typeof request.body === 'string' ? JSON.parse(request.body) : form,
                });
                return { body: { data: { id: 'u1' }, meta: {} } };
            };
            const transport = createHostTransport(Object.fromEntries(
                Object.entries(routes).map(([key, route]) => [key, (request, form) => {
                    record(request, form);
                    return route(request, form);
                }]),
            ));
            const commands = defineCLIEntityCommands({ transport });

            return runCommand(commands[noun]!, { rawArgs });
        }

        it('lists with the query flags carried as rapiq parameters and prints the body', async () => {
            await run('user', ['list', '--filter', 'name=~ali&realm.name=master', '--sort', '-createdAt', '--include', 'realm', '--limit', '10', '--offset', '20'], { 'GET /users': () => ({ body: { data: [{ id: 'u1' }], meta: { total: 1 } } }) });

            const query = createURLCodec().decode(new URL(requests[0]!.url).search.slice(1));
            expect(query).toMatchObject({
                filters: {
                    operator: 'and',
                    value: [
                        {
                            field: 'name',
                            operator: 'endsWith',
                            value: 'ali',
                        },
                        {
                            field: 'realm.name',
                            operator: 'eq',
                            value: 'master',
                        },
                    ],
                },
                sorts: { value: [{ name: 'createdAt', operator: 'DESC' }] },
                relations: { value: [{ name: 'realm' }] },
                pagination: { limit: 10, offset: 20 },
            });
            expect(JSON.parse(output.join(''))).toEqual({ data: [{ id: 'u1' }], meta: { total: 1 } });
        });

        it('reads one record', async () => {
            await run('user', ['get', 'u1', '--fields', 'id,name'], { 'GET /users/u1': () => ({ body: { data: { id: 'u1' }, meta: {} } }) });

            expect(requests[0]!.method).toEqual('GET');
            expect(new URL(requests[0]!.url).pathname).toEqual('/users/u1');
        });

        it('creates, updates and deletes with the payload from --data', async () => {
            await run('user', ['create', '--data', '{"name":"alice"}'], { 'POST /users': () => ({ status: 201, body: { data: { id: 'u1' }, meta: {} } }) });
            await run('user', ['update', 'u1', '-d', '{"displayName":"Alice"}'], { 'POST /users/u1': () => ({ body: { data: { id: 'u1' }, meta: {} } }) });
            await run('user', ['delete', 'u1'], { 'DELETE /users/u1': () => ({ status: 202, body: { data: { id: 'u1' }, meta: {} } }) });

            expect(requests.map((request) => [request.method, new URL(request.url).pathname, request.body])).toEqual([
                ['POST', '/users', { name: 'alice' }],
                ['POST', '/users/u1', { displayName: 'Alice' }],
                ['DELETE', '/users/u1', {}],
            ]);
        });

        it('reads --data from a file', async () => {
            const file = path.join(root, 'user.json');
            await fs.writeFile(file, '{"name":"bob"}');

            await run('user', ['create', '--data', `@${file}`], { 'POST /users': () => ({ body: { data: {}, meta: {} } }) });

            expect(requests[0]!.body).toEqual({ name: 'bob' });
        });

        it('refuses a malformed page number before any request', async () => {
            await expect(run('user', ['list', '--limit', 'ten'], {})).rejects.toThrow(/--limit must be a non-negative integer/);
            expect(requests).toEqual([]);
        });

        it('lists every noun against its own root collection', async () => {
            const urls : string[] = [];
            const transport = new MemoryTransport({
                fetch: (request) => {
                    urls.push(request.url);
                    return { body: { data: [], meta: { total: 0 } } };
                },
            });
            const commands = defineCLIEntityCommands({ transport });

            for (const noun of NOUNS) {
                await runCommand(commands[noun]!, { rawArgs: ['list'] });
            }

            expect(urls).toHaveLength(NOUNS.length);
            for (const url of urls) {
                expect(new URL(url).pathname).not.toMatch(/undefined|object/);
            }
        });
    });
});

describe('readEntityQuery', () => {
    it('yields nothing without flags', () => {
        expect(readEntityQuery({})).toBeUndefined();
    });

    it('refuses a condition without a key', () => {
        expect(() => readEntityQuery({ filter: '=alice' })).toThrow(/Invalid --filter condition/);
    });
});

describe('readEntityData', () => {
    it('reads stdin for @-', async () => {
        expect(await readEntityData('@-', Readable.from(['{"a":', '1}']))).toEqual({ a: 1 });
    });

    it('refuses anything but a JSON object', async () => {
        await expect(readEntityData('[1]')).rejects.toThrow(/JSON object/);
        await expect(readEntityData('nope')).rejects.toThrow(/JSON object/);
    });
});
