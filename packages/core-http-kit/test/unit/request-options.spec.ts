/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import type { TransportRequest } from 'hapic';
import { ErrorCode, MemoryTransport, isClientError } from 'hapic';
import { describe, expect, it } from 'vitest';
import type { APIRequestOptions } from '../../src';
import { Client, isClientErrorDueTimeout } from '../../src';
import { createFakeClient } from '../../src/testing';

type ArgsBuilder = (options: APIRequestOptions) => unknown[];

type MethodTable = Record<string, ArgsBuilder>;

const ID = '00000000-0000-4000-8000-000000000000';

/**
 * The argument lists of the CRUD surface every entity API shares.
 */
const ENTITY_METHODS : MethodTable = {
    getMany: (o) => [undefined, o],
    getOne: (o) => [ID, undefined, o],
    create: (o) => [{}, o],
    update: (o) => [ID, {}, o],
    createOrUpdate: (o) => ['name', {}, o],
    delete: (o) => [ID, o],
    getStats: (o) => [undefined, o],
    getSchema: (o) => [o],
};

/**
 * Every method outside {@link ENTITY_METHODS}, per sub-API, with a minimal
 * argument list. An entry here wins over the shared one.
 */
const METHODS : Record<string, MethodTable> = {
    account: {
        getSession: (o) => [o],
        deleteSession: (o) => [o],
    },
    authorization: {
        get: (o) => [o],
        check: (o) => [{}, o],
        checkWithMaxAge: (o) => [{}, o],
    },
    authorize: {
        getInfo: (o) => [undefined, o],
        confirm: (o) => [{}, o],
    },
    client: { rotateSecret: (o) => [ID, undefined, o] },
    deviceAuthorization: {
        create: (o) => [{ client_id: 'cli' }, o],
        lookup: (o) => [{ user_code: 'ABCD-EFGH' }, o],
        approve: (o) => [{ user_code: 'ABCD-EFGH' }, o],
        deny: (o) => [{ user_code: 'ABCD-EFGH' }, o],
    },
    identityProvider: {
        createLinkRequest: (o) => [ID, o],
        confirmLinkRequest: (o) => [ID, 'handle', o],
        completeLogin: (o) => [ID, o],
    },
    permission: { check: (o) => ['name', undefined, o] },
    policy: {
        getOneExpanded: (o) => [ID, undefined, o],
        createBuiltIn: (o) => [{}, o],
        updateBuiltIn: (o) => [ID, {}, o],
        createOrUpdateBuiltin: (o) => ['name', {}, o],
        check: (o) => ['name', undefined, o],
    },
    schema: { getMany: (o) => [o] },
    session: { deleteMany: (o) => [undefined, o] },
    sessionToken: { deleteMany: (o) => [{}, o] },
    status: { get: (o) => [o] },
    token: {
        createWithRefreshToken: (o) => [{ refresh_token: 'rt' }, o],
        createWithClientCredentials: (o) => [{ client_id: 'cli', client_secret: 'secret' }, o],
        createWithPassword: (o) => [{ username: 'admin', password: 'start123' }, o],
        createWithAuthorizationCode: (o) => [{ code: 'code', redirect_uri: 'https://app.test/cb' }, o],
        createWithDeviceCode: (o) => [{ device_code: 'dc' }, o],
        create: (o) => [{ grant_type: 'client_credentials' }, o],
        revoke: (o) => [{ token: 'tok' }, o],
        introspect: (o) => [{ token: 'tok' }, o],
    },
    user: {
        activate: (o) => ['token', o],
        register: (o) => [{}, o],
        passwordForgot: (o) => [{}, o],
        passwordReset: (o) => [{ token: 'tok', password: 'start123' }, o],
    },
    userAuthenticator: {
        getMany: (o) => [ID, undefined, o],
        getOne: (o) => [ID, ID, o],
        enroll: (o) => [ID, {}, o],
        confirm: (o) => [ID, ID, {}, o],
        delete: (o) => [ID, ID, o],
        challenge: (o) => [o],
        sendChallenge: (o) => [{}, o],
        verifyChallenge: (o) => [{}, o],
    },
};

/**
 * Methods that send no request of their own, or whose request authup
 * cannot reach, each with the reason.
 */
const IGNORED : Record<string, Record<string, string>> = {
    authorize: { buildURL: 'builds a url, sends nothing' },
    identityProvider: { getAuthorizeUri: 'builds a url, sends nothing' },
    token: {
        createWithRobotCredentials: 'a @hapic/oauth2 grant authup does not serve',
        extendCreateParameters: 'a @hapic/oauth2 helper, sends nothing',
        buildRequestOptions: 'a @hapic/oauth2 helper, sends nothing',
        buildRequestTransformers: 'a @hapic/oauth2 helper, sends nothing',
        buildURLSearchParams: 'a @hapic/oauth2 helper, sends nothing',
    },
    userInfo: { get: '@hapic/oauth2 UserInfoAPI.get takes no request options' },
};

/**
 * The configuration surface of @hapic/oauth2's api base class.
 */
const IGNORED_EVERYWHERE = new Set(['setClient', 'setOptions', 'setOption', 'withBaseURL']);

const CLIENT_METHODS : MethodTable = {
    getJwks: (o) => [o],
    getJwk: (o) => [ID, undefined, o],
    getWellKnownOpenIDConfiguration: (o) => [o],
};

function createStalledTransport() : MemoryTransport {
    return new MemoryTransport({
        fetch: (request: TransportRequest) => new Promise((resolve, reject) => {
            const { signal } = request;

            if (!signal) {
                resolve({ status: 200, body: {} });

                return;
            }

            if (signal.aborted) {
                reject(signal.reason);

                return;
            }

            signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        }),
    });
}

function createClient(transport: MemoryTransport) : Client {
    return new Client({
        baseURL: 'http://authup.test',
        transport,
    });
}

function listMethods(input: object) : string[] {
    const output = new Set<string>();

    let prototype = Object.getPrototypeOf(input);

    while (prototype && prototype !== Object.prototype) {
        const names = Object.getOwnPropertyNames(prototype);

        for (const name of names) {
            const descriptor = Object.getOwnPropertyDescriptor(prototype, name);

            if (
                name !== 'constructor' &&
                descriptor &&
                typeof descriptor.value === 'function'
            ) {
                output.add(name);
            }
        }

        prototype = Object.getPrototypeOf(prototype);
    }

    return [...output].sort();
}

function listSubAPIs(client: Client) : string[] {
    return Object.keys(client)
        .filter((key) => {
            const value = (client as unknown as Record<string, unknown>)[key];

            return !!value &&
                typeof value === 'object' &&
                (value as { client?: unknown }).client === client;
        })
        .sort();
}

const ENTITY_TYPES = new Set<string>(Object.values(EntityType));

function resolveArgsBuilder(api: string, method: string) : ArgsBuilder | undefined {
    if (METHODS[api] && METHODS[api][method]) {
        return METHODS[api][method];
    }

    if (ENTITY_TYPES.has(api) && ENTITY_METHODS[method]) {
        return ENTITY_METHODS[method];
    }

    return undefined;
}

type Case = {
    name: string,
    api?: string,
    method: string,
    args: ArgsBuilder,
};

function buildCases() : Case[] {
    const client = createClient(new MemoryTransport());

    const output : Case[] = [];

    const apis = listSubAPIs(client);

    for (const api of apis) {
        const instance = (client as unknown as Record<string, object>)[api];

        const methods = listMethods(instance);

        for (const method of methods) {
            if (IGNORED_EVERYWHERE.has(method) || (IGNORED[api] && IGNORED[api][method])) {
                continue;
            }

            const args = resolveArgsBuilder(api, method);

            if (!args) {
                throw new Error(`${api}.${method} has no entry in the request options table.`);
            }

            output.push({
                name: `${api}.${method}`,
                api,
                method,
                args,
            });
        }
    }

    const methods = Object.keys(CLIENT_METHODS);

    for (const method of methods) {
        output.push({
            name: `client#${method}`,
            method,
            args: CLIENT_METHODS[method],
        });
    }

    return output;
}

function invoke(client: Client, entry: Case, options: APIRequestOptions) : Promise<unknown> {
    const target = (entry.api ?
        (client as unknown as Record<string, unknown>)[entry.api] :
        client) as Record<string, (...args: unknown[]) => Promise<unknown>>;

    return target[entry.method](...entry.args(options));
}

const CASES = buildCases();

describe('per-call request options', () => {
    it('should cover every sub-api', () => {
        const client = createClient(new MemoryTransport());

        const covered = new Set(CASES.map((entry) => entry.api).filter(Boolean));

        for (const api of listSubAPIs(client)) {
            if (!covered.has(api)) {
                const methods = listMethods((client as unknown as Record<string, object>)[api])
                    .filter((method) => !IGNORED_EVERYWHERE.has(method));

                expect(Object.keys(IGNORED[api] || {}).sort()).toEqual(methods);
            }
        }

        expect(covered.has('role')).toBe(true);
        expect(covered.has('token')).toBe(true);
    });

    it.each(CASES.map((entry) => [entry.name, entry] as const))(
        '%s should abort with the caller signal',
        async (_name, entry) => {
            const transport = createStalledTransport();
            const client = createClient(transport);

            const controller = new AbortController();

            const promise = invoke(client, entry, { signal: controller.signal })
                .catch((e: unknown) => e);

            await new Promise((resolve) => {
                setTimeout(resolve, 0); 
            });

            controller.abort();

            const error = await promise;

            expect(isClientError(error)).toBe(true);
            expect(isClientError(error) ? error.code : undefined).toEqual(ErrorCode.CONNECTION_ABORTED);

            expect(transport.requests.length).toBeGreaterThan(0);

            const { signal } = transport.requests[transport.requests.length - 1];

            expect(signal && signal.aborted).toBe(true);
        },
    );

    it.each(CASES.map((entry) => [entry.name, entry] as const))(
        '%s should time out with the per-call timeout',
        async (_name, entry) => {
            const client = createClient(createStalledTransport());

            const error = await invoke(client, entry, { timeout: 10 })
                .catch((e: unknown) => e);

            expect(isClientErrorDueTimeout(error)).toBe(true);
        },
    );

    it('should record the options with the request on the fake client', async () => {
        const client = createFakeClient();

        const controller = new AbortController();

        await client.role.getMany(undefined, { signal: controller.signal, timeout: 1000 });
        await client.role.getOne(ID);

        expect(client.requests[0].options).toEqual({ signal: controller.signal, timeout: 1000 });
        expect(client.requests[1].options).toEqual({});
    });
});
