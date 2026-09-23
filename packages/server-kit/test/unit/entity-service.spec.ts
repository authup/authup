/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionEvaluationContext } from '@authup/access';
import { BuiltInPolicyType } from '@authup/access';
import { describe, expect, it } from 'vitest';
import { AbstractEntityService } from '../../src';
import type { ActorContext } from '../../src';

class Service extends AbstractEntityService {
    run(...args: Parameters<AbstractEntityService['evaluateUpdate']>) {
        return this.evaluateUpdate(...args);
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
            (row) => ({ [BuiltInPolicyType.REALM_MATCH]: row.realmId }),
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

        await expect(new Service().run(actor, 'client_update', {}, {})).rejects.toThrow('denied');
        expect(calls).toHaveLength(1);
    });
});
