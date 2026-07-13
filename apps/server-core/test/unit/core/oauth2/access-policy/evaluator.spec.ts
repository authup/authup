/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { BuiltInPolicyType } from '@authup/access';
import type { BasePolicy, IdentityPolicyData } from '@authup/access';
import { describe, expect, it } from 'vitest';
import { OAuth2AccessPolicyEvaluator } from '../../../../../src/core/oauth2/access-policy/module.ts';
import type { IOAuth2AccessPolicyProvider } from '../../../../../src/core/oauth2/access-policy/types.ts';
import { FakeIdentityPermissionProvider } from '../../helpers/index.ts';

class FakePolicyProvider implements IOAuth2AccessPolicyProvider {
    public calls: string[] = [];

    protected tree: BasePolicy | null;

    protected error?: Error;

    constructor(tree: BasePolicy | null = null, error?: Error) {
        this.tree = tree;
        this.error = error;
    }

    async findDescendantsTreeById(id: string): Promise<BasePolicy | null> {
        this.calls.push(id);

        if (this.error) {
            throw this.error;
        }

        return this.tree;
    }
}

const subject: IdentityPolicyData = {
    type: 'user',
    id: randomUUID(),
    clientId: null,
    realmId: randomUUID(),
    realmName: 'master',
};

const buildEvaluator = (provider: IOAuth2AccessPolicyProvider) => new OAuth2AccessPolicyEvaluator({
    policyProvider: provider,
    identityPermissionProvider: new FakeIdentityPermissionProvider(),
});

describe('core/oauth2/access-policy — OAuth2AccessPolicyEvaluator', () => {
    it('should permit access when the policy passes for the subject', async () => {
        // an identity policy without a type restriction permits every identity
        const provider = new FakePolicyProvider({ type: BuiltInPolicyType.IDENTITY });
        const evaluator = buildEvaluator(provider);

        const policyId = randomUUID();
        await expect(evaluator.evaluate(policyId, subject)).resolves.toBe(true);
        expect(provider.calls).toEqual([policyId]);
    });

    it('should deny access when the policy fails for the subject', async () => {
        const provider = new FakePolicyProvider({
            type: BuiltInPolicyType.IDENTITY,
            types: ['robot'],
        } as BasePolicy);
        const evaluator = buildEvaluator(provider);

        await expect(evaluator.evaluate(randomUUID(), subject)).resolves.toBe(false);
    });

    it('should fail closed when the policy id does not resolve to a tree', async () => {
        // a dangling access_policy_id on the client row = misconfiguration → deny
        const evaluator = buildEvaluator(new FakePolicyProvider(null));

        await expect(evaluator.evaluate(randomUUID(), subject)).resolves.toBe(false);
    });

    it('should fail closed when loading the policy tree throws', async () => {
        const evaluator = buildEvaluator(new FakePolicyProvider(null, new Error('db gone')));

        await expect(evaluator.evaluate(randomUUID(), subject)).resolves.toBe(false);
    });

    it('should resolve a composite tree through the engine (all children pass)', async () => {
        const evaluator = buildEvaluator(new FakePolicyProvider({
            type: BuiltInPolicyType.COMPOSITE,
            children: [
                { type: BuiltInPolicyType.IDENTITY },
                { type: BuiltInPolicyType.IDENTITY, types: ['user'] },
            ],
        } as BasePolicy));

        await expect(evaluator.evaluate(randomUUID(), subject)).resolves.toBe(true);
    });

    it('should deny a composite tree whose child fails (unanimous default)', async () => {
        const evaluator = buildEvaluator(new FakePolicyProvider({
            type: BuiltInPolicyType.COMPOSITE,
            children: [
                { type: BuiltInPolicyType.IDENTITY },
                { type: BuiltInPolicyType.IDENTITY, types: ['robot'] },
            ],
        } as BasePolicy));

        await expect(evaluator.evaluate(randomUUID(), subject)).resolves.toBe(false);
    });

    it('should fail closed for a policy type whose required data is not part of the subject', async () => {
        // the evaluator supplies IDENTITY data only — an attributes policy has
        // no attribute bag here and must deny, never pass vacuously
        const evaluator = buildEvaluator(new FakePolicyProvider({
            type: BuiltInPolicyType.ATTRIBUTES,
            query: { name: { $eq: 'anything' } },
        } as BasePolicy));

        await expect(evaluator.evaluate(randomUUID(), subject)).resolves.toBe(false);
    });
});
