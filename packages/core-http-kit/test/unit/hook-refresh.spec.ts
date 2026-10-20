/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TransportRequest } from 'hapic';
import { describe, expect, it } from 'vitest';
import { Client, ClientAuthenticationHook } from '../../src';
import type { ClientOptions } from '../../src';

type Transport = NonNullable<ClientOptions['transport']>;

type Answer = { status: number, body: Record<string, any> };

type Handler = (request: TransportRequest) => Answer | Promise<Answer>;

function createTransport(handler: Handler) : { transport: Transport, requests: TransportRequest[] } {
    const requests : TransportRequest[] = [];

    return {
        requests,
        transport: {
            dispatch: async (request) => {
                requests.push(request);

                const { status, body } = await handler(request);

                return new Response(JSON.stringify(body), {
                    status,
                    headers: { 'content-type': 'application/json' },
                });
            },
        },
    };
}

function readAuthorization(request: TransportRequest) : string | null {
    return new Headers(request.headers as HeadersInit).get('authorization');
}

function isTokenRequest(request: TransportRequest) {
    return new URL(request.url).pathname === '/token';
}

function settlesWithin<T>(promise: Promise<T>, ms: number) : Promise<'resolved' | 'rejected' | 'hang'> {
    return Promise.race([
        promise.then(() => 'resolved' as const, () => 'rejected' as const),
        new Promise<'hang'>((resolve) => {
            setTimeout(() => resolve('hang'), ms);
        }),
    ]);
}

const TOKEN_REFUSED : Answer = {
    status: 401,
    body: {
        code: 'invalid_client',
        error: 'invalid_client',
        message: 'Client authentication failed',
    },
};

const TOKEN_EXPIRED : Answer = {
    status: 401,
    body: {
        code: 'expired_token',
        message: 'The token is expired.',
    },
};

function tokenGranted(accessToken: string) : Answer {
    return {
        status: 200,
        body: {
            access_token: accessToken,
            expires_in: 900,
            token_type: 'Bearer',
        },
    };
}

/**
 * The token creator posts /token on the very client the hook is
 * attached to, which is the shape that used to deadlock.
 */
function createHookedClient(handler: Handler) {
    const { transport, requests } = createTransport(handler);
    const client = new Client({ baseURL: 'http://fake.test/', transport });

    const hook = new ClientAuthenticationHook({
        timer: false,
        tokenCreator: () => client.token.createWithRefreshToken({ refresh_token: 'rt' }),
    });

    hook.attach(client);
    hook.setAuthorizationHeader({ type: 'Bearer', token: 'at-0' });

    return {
        client, 
        hook, 
        requests, 
    };
}

describe('src/hook (refresh on the hooked client)', () => {
    it('should reject a refresh refused by the token endpoint instead of hanging', async () => {
        const { client, hook } = createHookedClient((request) => {
            if (isTokenRequest(request)) {
                return TOKEN_REFUSED;
            }

            return TOKEN_EXPIRED;
        });

        expect(await settlesWithin(client.realm.getMany(), 1000)).toEqual('rejected');
        expect(await settlesWithin(hook.refresh(), 1000)).toEqual('rejected');
    });

    it('should refresh again after a refused refresh and replay with the new token', async () => {
        let tokenAnswers = [TOKEN_REFUSED, tokenGranted('at-2')];

        const { client, requests } = createHookedClient((request) => {
            if (isTokenRequest(request)) {
                const [next, ...rest] = tokenAnswers;
                tokenAnswers = rest;
                return next!;
            }

            if (readAuthorization(request) === 'Bearer at-2') {
                return { status: 200, body: { data: [], meta: { total: 0 } } };
            }

            return TOKEN_EXPIRED;
        });

        expect(await settlesWithin(client.realm.getMany(), 1000)).toEqual('rejected');
        expect(await settlesWithin(client.realm.getMany(), 1000)).toEqual('resolved');

        const replayed = requests[requests.length - 1]!;
        expect(isTokenRequest(replayed)).toBe(false);
        expect(readAuthorization(replayed)).toEqual('Bearer at-2');
    });

    it('should refresh and replay a request answered with a jwt code', async () => {
        const { client, requests } = createHookedClient((request) => {
            if (isTokenRequest(request)) {
                return tokenGranted('at-1');
            }

            if (readAuthorization(request) === 'Bearer at-1') {
                return { status: 200, body: { data: [], meta: { total: 0 } } };
            }

            return TOKEN_EXPIRED;
        });

        expect(await settlesWithin(client.realm.getMany(), 1000)).toEqual('resolved');
        expect(requests.filter(isTokenRequest)).toHaveLength(1);
        expect(readAuthorization(requests[requests.length - 1]!)).toEqual('Bearer at-1');
    });

    it('should let a second request wait for an in-flight refresh and replay it', async () => {
        const tokenGate = Promise.withResolvers<void>();

        const { client, requests } = createHookedClient(async (request) => {
            if (isTokenRequest(request)) {
                await tokenGate.promise;
                return tokenGranted('at-1');
            }

            if (readAuthorization(request) === 'Bearer at-1') {
                return { status: 200, body: { data: [], meta: { total: 0 } } };
            }

            return TOKEN_EXPIRED;
        });

        const first = client.realm.getMany();
        const second = client.user.getMany();

        // both requests failed and the refresh is waiting on /token
        while (requests.length < 3) {
            await new Promise((resolve) => {
                setTimeout(resolve, 1);
            });
        }
        tokenGate.resolve();

        expect(await settlesWithin(first, 1000)).toEqual('resolved');
        expect(await settlesWithin(second, 1000)).toEqual('resolved');
        expect(requests.filter(isTokenRequest)).toHaveLength(1);
    });
});
