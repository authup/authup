/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container, isValidupError } from 'validup';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AUTHORIZATION_POLICY_WITHHELD_TYPE, PolicyDefaultValidators, projectAuthorizationPolicy } from '../../../src';

class WeekdayPolicyValidator extends Container<{ weekday: number }> {
    override initialize() {
        super.initialize();

        this.mount('weekday', createValidator(z.number().int().min(0).max(6)));
    }
}

describe('permission/authorization/policy', () => {
    it('keeps the configuration keys of a type and drops entity columns', async () => {
        const projected = await projectAuthorizationPolicy({
            id: 'p1',
            name: 'system.identity',
            displayName: null,
            description: null,
            builtIn: true,
            realmId: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            type: 'identity',
            types: ['user'],
            invert: false,
        });

        expect(projected).toEqual({
            type: 'identity',
            types: ['user'],
            invert: false,
        });
    });

    it('projects composite children recursively and keeps the decision strategy', async () => {
        const projected = await projectAuthorizationPolicy({
            id: 'p2',
            type: 'composite',
            decisionStrategy: 'unanimous',
            children: [
                {
                    id: 'p3',
                    type: 'identity',
                    builtIn: true,
                },
                {
                    id: 'p4',
                    type: 'permissionBinding',
                    name: 'system.permission-binding',
                },
            ],
        });

        expect(projected).toEqual({
            type: 'composite',
            decisionStrategy: 'unanimous',
            children: [
                { type: 'identity' },
                { type: 'permissionBinding' },
            ],
        });
    });

    it('keeps an attributes query verbatim', async () => {
        const projected = await projectAuthorizationPolicy({
            type: 'attributes',
            query: { visible: { $eq: true } },
        });

        expect(projected).toEqual({ type: 'attributes', query: { visible: { $eq: true } } });
    });

    it('refuses an unknown type and a missing type', async () => {
        await expect(projectAuthorizationPolicy({ type: 'custom' })).rejects.toThrow();
        await expect(projectAuthorizationPolicy({ names: ['a'] })).rejects.toThrow();
    });

    it('projects a custom type through an extended registry, inside a composite too (#3635)', async () => {
        const validators = { ...PolicyDefaultValidators, weekday: new WeekdayPolicyValidator() };

        expect(await projectAuthorizationPolicy({
            id: 'p5', 
            type: 'weekday', 
            weekday: 3, 
        }, validators))
            .toEqual({ type: 'weekday', weekday: 3 });
        expect(await projectAuthorizationPolicy({
            type: 'composite',
            decisionStrategy: 'unanimous',
            children: [{ type: 'weekday', weekday: 1 }],
        }, validators)).toEqual({
            type: 'composite',
            decisionStrategy: 'unanimous',
            children: [{ type: 'weekday', weekday: 1 }],
        });
        // a short type name nests like a long one: the composite's own child
        // check must not be narrower than the head the node is projected with
        expect(await projectAuthorizationPolicy({
            type: 'composite',
            children: [{ type: 'ip' }],
        }, { ...validators, ip: new Container<Record<string, any>>() })).toEqual({
            type: 'composite',
            children: [{ type: 'ip' }],
        });
        await expect(projectAuthorizationPolicy({ type: 'weekday', weekday: 9 }, validators)).rejects.toThrow();
        // the default registry still refuses it
        await expect(projectAuthorizationPolicy({ type: 'weekday', weekday: 3 })).rejects.toThrow();
    });

    it('keeps the default registry immutable, so extending it takes a spread (#3635)', () => {
        expect(Object.isFrozen(PolicyDefaultValidators)).toBe(true);
        expect(() => {
            (PolicyDefaultValidators as Record<string, unknown>).weekday = {};
        }).toThrow(TypeError);
    });

    it('refuses the withheld node even when a registry names it, and never reads the prototype', async () => {
        const validators = { ...PolicyDefaultValidators, [AUTHORIZATION_POLICY_WITHHELD_TYPE]: new WeekdayPolicyValidator() };
        await expect(projectAuthorizationPolicy({ type: AUTHORIZATION_POLICY_WITHHELD_TYPE, weekday: 1 }, validators))
            .rejects.toThrow();
        await expect(projectAuthorizationPolicy({ type: 'constructor' })).rejects.toThrow();
    });

    it('round-trips a childless composite', async () => {
        expect(await projectAuthorizationPolicy({ type: 'composite', children: [] }))
            .toEqual({ type: 'composite', children: [] });
    });

    // The server emits this node for a tree the caller's realm reach does not
    // cover. Its whole safety is that the projection REFUSES it: projected, a
    // withheld tree would be evaluated as whatever type it names, and the grants
    // naming it would pass rather than drop.
    it('refuses the node a withheld policy travels as', async () => {
        await expect(projectAuthorizationPolicy({ type: AUTHORIZATION_POLICY_WITHHELD_TYPE }))
            .rejects.toThrow();
        await expect(projectAuthorizationPolicy({
            type: 'composite',
            decisionStrategy: 'unanimous',
            children: [{ type: AUTHORIZATION_POLICY_WITHHELD_TYPE }],
        })).rejects.toThrow();
    });

    it('refuses a malformed configuration', async () => {
        await expect(projectAuthorizationPolicy({ type: 'attributeNames', names: 'not-a-list' })).rejects.toThrow();
    });

    it('refuses with a validup error, naming the node in the tree that is wrong', async () => {
        const issuesOf = async (input: unknown) => {
            try {
                await projectAuthorizationPolicy(input);
            } catch (e) {
                if (isValidupError(e)) {
                    return e.issues;
                }

                throw e;
            }

            throw new Error('Expected the tree to be refused.');
        };

        expect((await issuesOf({ type: 'custom' }))[0]!.path).toEqual(['type']);
        expect((await issuesOf({ type: 'composite', children: 'not-a-list' }))[0]!.path).toEqual(['children']);
        expect((await issuesOf({
            type: 'composite',
            children: [{ type: 'identity' }, { type: 'composite', children: [{ type: 'custom' }] }],
        }))[0]!.path).toEqual(['children', 1, 'children', 0, 'type']);
    });
});
