/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client, pickEntityAPI } from '@authup/core-http-kit';
import type { EntityAPIDispatch } from '@authup/core-http-kit';
import { EntityType } from '@authup/core-kit';
import type { EntityTypeMap } from '@authup/core-kit';
import { defineCommand } from 'citty';
import type { ArgsDef, CommandDef } from 'citty';
import {
    HOST_ARGS,
    openHost,
    runHostCommand,
    writeJSON,
} from '../../host/index.ts';
import type { HostCommandContext } from '../../host/index.ts';
import { readEntityData } from './data.ts';
import { readEntityQuery } from './query.ts';
import type { EntityName } from './types.ts';

// `Record<string, any>` alone leaves `DomainEntityID<T>` unresolved to
// `never`, because it carries no property TypeScript can pick `id` off of;
// the intersected `id: string` gives it one.
type EntityAPI = EntityAPIDispatch<{ id: string } & Record<string, any>>;

const QUERY_ARGS = {
    filter: {
        type: 'string',
        description: 'Conditions in the API query language, joined by &: name=~ali~&realm.name=master',
    },
    sort: {
        type: 'string',
        description: 'Sort keys, comma-separated, - for descending: -createdAt,name',
    },
    fields: {
        type: 'string',
        description: 'Columns to select, comma-separated.',
    },
    include: {
        type: 'string',
        description: 'Relations to include, comma-separated.',
    },
    limit: {
        type: 'string',
        description: 'Page size.',
    },
    offset: {
        type: 'string',
        description: 'Page offset.',
    },
} satisfies ArgsDef;

const RECORD_ARGS = {
    id: {
        type: 'positional',
        required: true,
        description: 'The record id.',
    },
} satisfies ArgsDef;

const DATA_ARGS = {
    data: {
        type: 'string',
        alias: 'd',
        required: true,
        description: 'A JSON object, @<path> to read one from a file, or @- to read it from stdin.',
    },
} satisfies ArgsDef;

function toKebabCase(input: string) : string {
    return input.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function unsupported(noun: string, verb: string) : Error {
    return new Error(`The ${noun} API does not support ${verb}.`);
}

function defineEntityCommand(type: EntityName, probe: EntityAPI, context: HostCommandContext) : CommandDef {
    const noun = toKebabCase(type);
    const subCommands : Record<string, CommandDef<any>> = {};

    const open = async (server: string | undefined) : Promise<EntityAPI> => {
        const opened = await openHost(server, context);

        return pickEntityAPI(opened.client, type as keyof EntityTypeMap) as EntityAPI;
    };

    if (probe.getMany) {
        subCommands.list = defineCommand({
            meta: { name: 'list', description: `List ${noun} records.` },
            args: { ...HOST_ARGS, ...QUERY_ARGS },
            run: ({ args }) => runHostCommand(async () => {
                const query = readEntityQuery(args);
                const api = await open(args.server);
                if (!api.getMany) {
                    throw unsupported(noun, 'list');
                }

                writeJSON(await api.getMany(query));
            }),
        });
    }

    if (probe.getOne) {
        subCommands.get = defineCommand({
            meta: { name: 'get', description: `Read one ${noun} record.` },
            args: {
                ...RECORD_ARGS,
                ...HOST_ARGS,
                fields: QUERY_ARGS.fields,
                include: QUERY_ARGS.include,
            },
            run: ({ args }) => runHostCommand(async () => {
                const query = readEntityQuery(args);
                const api = await open(args.server);
                if (!api.getOne) {
                    throw unsupported(noun, 'get');
                }

                writeJSON(await api.getOne(args.id, query));
            }),
        });
    }

    if (probe.create) {
        subCommands.create = defineCommand({
            meta: { name: 'create', description: `Create a ${noun} record.` },
            args: { ...HOST_ARGS, ...DATA_ARGS },
            run: ({ args }) => runHostCommand(async () => {
                const data = await readEntityData(args.data);
                const api = await open(args.server);
                if (!api.create) {
                    throw unsupported(noun, 'create');
                }

                writeJSON(await api.create(data));
            }),
        });
    }

    if (probe.update) {
        subCommands.update = defineCommand({
            meta: { name: 'update', description: `Update a ${noun} record.` },
            args: {
                ...RECORD_ARGS,
                ...HOST_ARGS,
                ...DATA_ARGS,
            },
            run: ({ args }) => runHostCommand(async () => {
                const data = await readEntityData(args.data);
                const api = await open(args.server);
                if (!api.update) {
                    throw unsupported(noun, 'update');
                }

                writeJSON(await api.update(args.id, data));
            }),
        });
    }

    if (probe.delete) {
        subCommands.delete = defineCommand({
            meta: { name: 'delete', description: `Delete a ${noun} record.` },
            args: { ...RECORD_ARGS, ...HOST_ARGS },
            run: ({ args }) => runHostCommand(async () => {
                const api = await open(args.server);
                if (!api.delete) {
                    throw unsupported(noun, 'delete');
                }

                writeJSON(await api.delete(args.id));
            }),
        });
    }

    return defineCommand({
        meta: { name: noun, description: `Read and manage ${noun} records.` },
        subCommands,
    });
}

/**
 * One command per entity-shaped API the client serves, mounted under the
 * `api` group, and one verb per dispatch method: the kit's registry is the
 * source, so a sub-API added there in the entity shape shows up here with
 * no edit.
 */
export function defineCLIEntityCommands(context: HostCommandContext = {}) : Record<string, CommandDef> {
    const probe = new Client();
    const commands : Record<string, CommandDef> = {};

    for (const type of Object.values(EntityType) as EntityName[]) {
        // `EntityType` is wider than `EntityTypeMap`: the map deliberately
        // omits `userAuthenticator`, whose client API is nested under a user
        // (`getMany(userId, query)`), so it is not entity-shaped and gets no
        // command. `pickEntityAPI` resolves by property presence at runtime,
        // which is why the cast alone would let it through.
        if (type === EntityType.USER_AUTHENTICATOR) {
            continue;
        }

        const api = pickEntityAPI(probe, type as keyof EntityTypeMap);
        if (!api) {
            continue;
        }

        commands[toKebabCase(type)] = defineEntityCommand(type, api as EntityAPI, context);
    }

    return commands;
}
