/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { IdentityPolicyData } from '../../../src';
import {
    buildPermissionKey,
    createAuthorizationSnapshotEvaluator,
    isPermissionError,
} from '../../../src';

const realmId = 'c641912c-21e5-4cb4-84b6-169e2b2bb023';
const clientId = 'c641912c-21e5-4cb4-84b6-169e2b2bb025';

describe('buildPermissionKey', () => {
    it('builds a key for a name carrying a lone surrogate instead of throwing', () => {
        expect(buildPermissionKey({ name: 'a\uD800' })).toBe(buildPermissionKey({ name: 'a\uFFFD' }));
        expect(() => buildPermissionKey({
            name: 'a',
            realmId: '\uDC00',
            clientId: '\uD800',
        })).not.toThrow();
    });

    it('keeps the key of every value the server produces', () => {
        expect(buildPermissionKey({ name: 'user_read' })).toBe('*/*/user_read');
        expect(buildPermissionKey({
            name: 'user_read',
            realmId,
            clientId: null,
        }))
            .toBe(`${realmId}/*/user_read`);
        expect(buildPermissionKey({
            name: 'a-b_c.d',
            realmId,
            clientId,
        }))
            .toBe(`${realmId}/${clientId}/a-b_c.d`);
        expect(buildPermissionKey({
            name: 'user_read',
            realmId: '',
            clientId: '',
        })).toBe('*/*/user_read');
    });

    it('tells a global namespace apart from a realm or client named *', () => {
        expect(buildPermissionKey({ name: 'read', realmId: '*' }))
            .not.toBe(buildPermissionKey({ name: 'read', realmId: null }));
        expect(buildPermissionKey({ name: 'read', clientId: '*' }))
            .not.toBe(buildPermissionKey({ name: 'read' }));
    });

    it('does not let a slash shift a segment', () => {
        expect(buildPermissionKey({ name: 'c', clientId: 'a/b' }))
            .not.toBe(buildPermissionKey({ name: 'b/c', clientId: 'a' }));
        expect(buildPermissionKey({ name: 'c', realmId: 'a/b' }))
            .not.toBe(buildPermissionKey({ name: 'b/c', realmId: 'a' }));
    });

    it('does not let a grant of a realm named * authorize the global definition', async () => {
        const identity : IdentityPolicyData = {
            id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
            type: 'user',
            realmId,
            realmName: 'master',
            clientId: null,
        };
        const evaluator = await createAuthorizationSnapshotEvaluator({
            snapshot: {
                definitions: [
                    { permission: { name: 'read', realmId: null }, policies: [{ type: 'permissionBinding' }] },
                    { permission: { name: 'read', realmId: '*' }, policies: [{ type: 'permissionBinding' }] },
                ],
                grants: [{ permission: { name: 'read', realmId: '*' }, realmScope: 'any' }],
            },
            identity,
        });
        const allowed = async (ctx: { name: string, realmId?: string | null }) => {
            try {
                await evaluator.evaluate(ctx);

                return true;
            } catch (e) {
                if (isPermissionError(e)) {
                    return false;
                }

                throw e;
            }
        };

        expect(await allowed({ name: 'read' })).toBe(false);
        expect(await allowed({ name: 'read', realmId: '*' })).toBe(true);
    });
});
