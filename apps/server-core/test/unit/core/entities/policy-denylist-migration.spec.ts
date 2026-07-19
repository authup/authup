/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { AttributeNamesPolicy } from '@authup/access';
import {
    AttributeNamesPolicyEvaluator,
    PolicyData,
    SystemPolicyName,
    definePolicyEvaluationContext,
} from '@authup/access';
import { describe, expect, it } from 'vitest';
import { DefaultProvisioningSource } from '../../../../src/index.ts';

const evaluator = new AttributeNamesPolicyEvaluator();

// The pre-1.0 `system.user-names-self-manage` denylist exactly as an upgraded
// deployment still persists it in `auth_policy_attributes` (plan 073: entity
// properties migrated to camelCase, stored policy data did not).
const STALE_SNAKE_NAMES = [
    'active',
    'name_locked',
    'status',
    'status_message',
    'realm_id',
];

async function evaluateDenylist(names: string[], attributes: Record<string, any>) {
    const policy : AttributeNamesPolicy = { invert: true, names };

    return evaluator.evaluate(policy, definePolicyEvaluationContext({ data: new PolicyData({ attributes }) }));
}

function loadProvisionedUserDenylistNames(): string[] {
    const entity = new DefaultProvisioningSource()
        .buildPolicies()
        .find((item) => item.attributes.name === SystemPolicyName.USER_NAMES_SELF_MANAGE);

    expect(entity).toBeDefined();
    expect(entity!.attributes.invert).toBe(true);

    const { names } = (entity!.extraAttributes!);
    expect(Array.isArray(names)).toBe(true);

    return names;
}

// Denylist semantics are fail-open by design: a `names` entry that no longer
// matches any attribute key simply never denies. After the camelCase property
// rename, a stale snake_case denylist row therefore PERMITS self-edits of the
// renamed admin-only fields — the security regression the plan-073 data
// migration and the provisioner MERGE rewrite exist to prevent.
describe('stale ATTRIBUTE_NAMES denylist across the camelCase migration (plan 073)', () => {
    it('fails open: the stale snake denylist no longer matches a camelCase self-edit of a renamed field', async () => {
        const outcome = await evaluateDenylist(STALE_SNAKE_NAMES, { nameLocked: true });

        // `name_locked` !== `nameLocked` — the entry never matches, so the
        // admin-only write passes the policy. If this assertion ever flips,
        // the fail-open window closed some other way and the migration
        // rationale should be revisited.
        expect(outcome.success).toBeTruthy();
    });

    it('fails open for every renamed admin-only field under the stale denylist', async () => {
        const outcome = await evaluateDenylist(STALE_SNAKE_NAMES, {
            nameLocked: true,
            statusMessage: 'spoofed',
            realmId: '2c1f11ac-1c60-4b3d-8f39-1d10c33ba0d9',
        });

        expect(outcome.success).toBeTruthy();
    });

    it('still denies fields whose name did not change', async () => {
        const outcome = await evaluateDenylist(STALE_SNAKE_NAMES, { active: false });

        expect(outcome.success).toBeFalsy();
    });

    it('denies the renamed field once the denylist carries the migrated camelCase names', async () => {
        const names = loadProvisionedUserDenylistNames();

        const outcome = await evaluateDenylist(names, { nameLocked: true });

        expect(outcome.success).toBeFalsy();
    });

    it('keeps permitting benign self-edit fields under the migrated denylist', async () => {
        const names = loadProvisionedUserDenylistNames();

        const outcome = await evaluateDenylist(names, {
            displayName: 'New Display Name',
            email: 'user@example.com',
        });

        expect(outcome.success).toBeTruthy();
    });

    it('provisions the user denylist with camelCase entries only', () => {
        const names = loadProvisionedUserDenylistNames();

        expect(names).toContain('nameLocked');
        expect(names).toContain('statusMessage');
        expect(names).toContain('realmId');

        for (const name of names) {
            expect(name, name).not.toMatch(/_/);
        }
    });
});
