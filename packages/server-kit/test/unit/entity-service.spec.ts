/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionEvaluationContext } from '@authup/access';
import { BuiltInPolicyType } from '@authup/access';
import { describe, expect, it } from 'vitest';
import { AbstractEntityService } from '../../src/index.ts';
import type { ActorContext, ActorIdentity } from '../../src/core/index.ts';

class Service extends AbstractEntityService {
    run(...args: Parameters<AbstractEntityService['evaluateUpdate']>) {
        return this.evaluateUpdate(...args);
    }

    realmOf(actor: Parameters<AbstractEntityService['getActorRealmId']>[0]) {
        return this.getActorRealmId(actor);
    }

    grantsOf(actor: ActorContext<unknown>) {
        return this.getActorGrants(actor);
    }
}

function createActor(calls: PermissionEvaluationContext[]): ActorContext {
    return {
        permissionEvaluator: {
            evaluate: async (ctx: PermissionEvaluationContext) => {
                calls.push(ctx);
            },
        },
    } as unknown as ActorContext;
}

describe('AbstractEntityService.evaluateUpdate (#3654)', () => {
    it('should evaluate the stored row and then the updated row, each with its own realm', async () => {
        const calls: PermissionEvaluationContext[] = [];

        await new Service().run(
            createActor(calls),
            'client_update',
            { pathId: null, realmId: 'stored' },
            { pathId: 'folder', realmId: 'next' },
            { realm: (row) => row.realmId },
        );

        expect(calls.map((c) => c.name)).toEqual(['client_update', 'client_update']);
        expect(calls.map((c) => c.data?.get(BuiltInPolicyType.ATTRIBUTES))).toEqual([
            { pathId: null, realmId: 'stored' },
            { pathId: 'folder', realmId: 'next' },
        ]);
        expect(calls.map((c) => c.data?.get(BuiltInPolicyType.REALM_MATCH))).toEqual(['stored', 'next']);
    });

    it('should stop at a refused stored row', async () => {
        const calls: string[] = [];
        const actor = {
            permissionEvaluator: {
                evaluate: async (ctx: PermissionEvaluationContext) => {
                    calls.push(String(ctx.name));

                    throw new Error('denied');
                },
            },
        } as unknown as ActorContext;

        await expect(new Service().run(actor, 'client_update', {}, {}, { realm: () => null })).rejects.toThrow('denied');
        expect(calls).toHaveLength(1);
    });
});

describe('AbstractEntityService actor helpers', () => {
    const permissionEvaluator = {} as ActorContext['permissionEvaluator'];

    it('should read the realm of a full identity row', () => {
        const actor: ActorContext = {
            permissionEvaluator,
            identity: { type: 'user', data: { realmId: 'r1' } } as ActorContext['identity'],
        };

        expect(new Service().realmOf(actor)).toBe('r1');
    });

    it('should read the realm of a narrow identity', async () => {
        const identity: ActorIdentity = {
            type: 'user',
            id: 'u1',
            realmId: 'r2',
            realmName: 'blog',
            clientId: null,
        };
        const actor: ActorContext<ActorIdentity> = {
            permissionEvaluator,
            identity,
            grants: async () => [{ permission: { name: 'post_read' } }],
        };

        expect(new Service().realmOf(actor)).toBe('r2');
        expect(new Service().realmOf({
            permissionEvaluator,
            identity: {
                type: 'client', 
                id: 'c1', 
                realmId: null, 
            }, 
        })).toBeUndefined();
        expect(new Service().realmOf({ permissionEvaluator })).toBeUndefined();
        expect(await new Service().grantsOf(actor)).toEqual([{ permission: { name: 'post_read' } }]);
    });

    it('should evaluate an update for a narrow actor', async () => {
        const calls: PermissionEvaluationContext[] = [];
        const actor = {
            ...createActor(calls),
            identity: {
                type: 'user', 
                id: 'u1', 
                realmId: 'r1', 
            },
        } as ActorContext<ActorIdentity>;

        await new Service().run(actor, 'post_update', {}, {}, { realm: () => false });

        expect(calls).toHaveLength(2);
    });
});
