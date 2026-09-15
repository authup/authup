/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isValidupError } from 'validup';
import { describe, expect, it } from 'vitest';
import { projectAuthorizationPolicy } from '../../../src';

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

    it('round-trips a childless composite', async () => {
        expect(await projectAuthorizationPolicy({ type: 'composite', children: [] }))
            .toEqual({ type: 'composite', children: [] });
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
