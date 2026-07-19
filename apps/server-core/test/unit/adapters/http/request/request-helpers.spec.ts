/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Identity, User } from '@authup/core-kit';
import { IdentityType } from '@authup/core-kit';
import { UnauthorizedError } from '@authup/errors';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import { describe, expect, it } from 'vitest';
import {
    RequestIdentity,
    RequestPermissionEvaluator,
    applyRouteRealmIDToBody,
    buildActorContext,
    getRequestRealmID,
    setRequestIdentity,
    setRequestPermissionEvaluator,
    setRequestRealmID,
    setRequestScopes,
    setRequestToken,
    useRequestIdentity,
    useRequestIdentityOrFail,
    useRequestScopes,
    useRequestToken,
} from '../../../../../src/adapters/http/request';
import { createFakeEvent } from './fake-event';

function clientIdentity(data: Partial<Client>): Identity {
    return { type: IdentityType.CLIENT, data: data as Client };
}

function userIdentity(data: Partial<User>): Identity {
    return { type: IdentityType.USER, data: data as User };
}

describe('RequestIdentity', () => {
    it('should expose a client identity id as its clientId', () => {
        const identity = new RequestIdentity(clientIdentity({ id: 'c1', realmId: 'r1' }));
        expect(identity.clientId).toEqual('c1');
        expect(identity.id).toEqual('c1');
        expect(identity.type).toEqual(IdentityType.CLIENT);
        expect(identity.realmId).toEqual('r1');
    });

    it('should derive a non-client clientId from the clientId field', () => {
        const identity = new RequestIdentity(userIdentity({ id: 'u1', clientId: 'c9' }));
        expect(identity.clientId).toEqual('c9');
    });

    it('should return null clientId when clientId is null', () => {
        const identity = new RequestIdentity(userIdentity({ id: 'u1', clientId: null }));
        expect(identity.clientId).toBeNull();
    });

    it('should read realm id/name from the nested realm relation', () => {
        const identity = new RequestIdentity(userIdentity({
            id: 'u1',
            realm: { id: 'r2', name: 'second' } as User['realm'],
        }));
        expect(identity.realmId).toEqual('r2');
        expect(identity.realmName).toEqual('second');
    });
});

describe('request identity helpers', () => {
    it('should wrap a raw identity and read it back', () => {
        const event = createFakeEvent();
        setRequestIdentity(event, clientIdentity({ id: 'c1' }));

        const identity = useRequestIdentity(event);
        expect(identity).toBeInstanceOf(RequestIdentity);
        expect(identity?.id).toEqual('c1');
    });

    it('should pass a RequestIdentity instance through unchanged', () => {
        const event = createFakeEvent();
        const wrapped = new RequestIdentity(clientIdentity({ id: 'c2' }));
        setRequestIdentity(event, wrapped);

        expect(useRequestIdentity(event)).toBe(wrapped);
    });

    it('should return undefined when no identity was set', () => {
        expect(useRequestIdentity(createFakeEvent())).toBeUndefined();
    });

    it('should throw UnauthorizedError from useRequestIdentityOrFail when unauthenticated', () => {
        expect(() => useRequestIdentityOrFail(createFakeEvent())).toThrow(UnauthorizedError);
    });

    it('should return the identity from useRequestIdentityOrFail when present', () => {
        const event = createFakeEvent();
        setRequestIdentity(event, clientIdentity({ id: 'c1' }));
        expect(useRequestIdentityOrFail(event).id).toEqual('c1');
    });
});

describe('request scopes', () => {
    it('should default to an empty array', () => {
        expect(useRequestScopes(createFakeEvent())).toEqual([]);
    });

    it('should store and read scopes', () => {
        const event = createFakeEvent();
        setRequestScopes(event, ['global']);
        expect(useRequestScopes(event)).toEqual(['global']);
    });
});

describe('request token', () => {
    it('should default to undefined', () => {
        expect(useRequestToken(createFakeEvent())).toBeUndefined();
    });

    it('should store and read the token', () => {
        const event = createFakeEvent();
        setRequestToken(event, 'abc');
        expect(useRequestToken(event)).toEqual('abc');
    });
});

describe('request realm id', () => {
    it('should return undefined when no realm is known', () => {
        expect(getRequestRealmID(createFakeEvent())).toBeUndefined();
    });

    it('should fall back to the realmId route param', () => {
        const event = createFakeEvent({ params: { realmId: 'master' } });
        expect(getRequestRealmID(event)).toEqual('master');
    });

    it('should let a stored realm id win over the route param', () => {
        const event = createFakeEvent({ params: { realmId: 'master' } });
        setRequestRealmID(event, 'resolved-uuid');
        expect(getRequestRealmID(event)).toEqual('resolved-uuid');
    });

    it('should apply the route realm over a body realm', () => {
        const event = createFakeEvent({ params: { realmId: 'route' } });
        const body: Record<string, any> = { realmId: 'body', name: 'x' };
        applyRouteRealmIDToBody(event, body);
        expect(body.realmId).toEqual('route');
    });

    it('should leave the body realm untouched when no realm is known', () => {
        const body: Record<string, any> = { realmId: 'body' };
        applyRouteRealmIDToBody(createFakeEvent(), body);
        expect(body.realmId).toEqual('body');
    });
});

describe('buildActorContext', () => {
    it('should assemble an actor context from identity and permission evaluator', () => {
        const event = createFakeEvent();
        const evaluator = new RequestPermissionEvaluator(event, new FakePermissionEvaluator());
        const raw = clientIdentity({ id: 'c1' });

        setRequestPermissionEvaluator(event, evaluator);
        setRequestIdentity(event, raw);

        const actor = buildActorContext(event);
        expect(actor.permissionEvaluator).toBe(evaluator);
        expect(actor.identity).toBe(raw);
    });

    it('should assemble an actor context without an identity', () => {
        const event = createFakeEvent();
        setRequestPermissionEvaluator(event, new RequestPermissionEvaluator(event, new FakePermissionEvaluator()));

        expect(buildActorContext(event).identity).toBeUndefined();
    });

    it('should throw when the permission evaluator is not initialised', () => {
        expect(() => buildActorContext(createFakeEvent())).toThrow('The request permission evaluator is not initialised.');
    });
});
