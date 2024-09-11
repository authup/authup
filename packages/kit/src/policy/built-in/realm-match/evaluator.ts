/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, isObject } from 'smob';
import { DecisionStrategy } from '../../../constants';
import { PolicyError } from '../../error';
import type { PolicyEvaluateContext, PolicyEvaluator } from '../../evaluator';
import type { PolicyData, PolicyWithType } from '../../types';
import { maybeInvertPolicyOutcome } from '../../helpers';
import { BuiltInPolicyType } from '../constants';
import type { RealmMatchPolicy } from './types';
import { RealmMatchPolicyValidator } from './validator';

export class RealmMatchPolicyEvaluator implements PolicyEvaluator<RealmMatchPolicy> {
    protected validator : RealmMatchPolicyValidator;

    constructor() {
        this.validator = new RealmMatchPolicyValidator();
    }

    async can(
        ctx: PolicyEvaluateContext<PolicyWithType>,
    ) : Promise<boolean> {
        return ctx.spec.type === BuiltInPolicyType.REALM_MATCH;
    }

    async validateSpecification(ctx: PolicyEvaluateContext) : Promise<RealmMatchPolicy> {
        return this.validator.run(ctx.spec);
    }

    async validateData(ctx: PolicyEvaluateContext<RealmMatchPolicy>) : Promise<PolicyData> {
        if (
            !isObject(ctx.data.attributes) ||
            !isObject(ctx.data.identity)
        ) {
            throw PolicyError.evaluatorContextInvalid();
        }

        return ctx.data;
    }

    async evaluate(ctx: PolicyEvaluateContext<
    RealmMatchPolicy
    >): Promise<boolean> {
        if (!ctx.data.attributes || !ctx.data.identity) {
            throw PolicyError.evaluatorContextInvalid();
        }

        if (
            ctx.spec.identityMasterMatchAll &&
            ctx.data.identity.realmName &&
            ctx.data.identity.realmName === 'master'
        ) {
            return maybeInvertPolicyOutcome(true, ctx.spec.invert);
        }

        let keys : string[];
        if (ctx.spec.attributeName) {
            if (Array.isArray(ctx.spec.attributeName)) {
                keys = ctx.spec.attributeName;
            } else {
                keys = [ctx.spec.attributeName];
            }
        } else {
            keys = [
                'realm_id',
                'realm_name',
                'realmId',
                'realmName',
            ];

            ctx.spec.decisionStrategy = DecisionStrategy.CONSENSUS;
        }

        const attributeNameStrict = ctx.spec.attributeNameStrict ?? true;
        if (!attributeNameStrict) {
            const resourceKeys = Object.keys(ctx.data.attributes);
            const keysToAdd : string[] = [];
            for (let i = 0; i < resourceKeys.length; i++) {
                let contains : boolean = false;

                for (let j = 0; j < keys.length; j++) {
                    if (
                        resourceKeys[i] !== keys[j] &&
                        resourceKeys[i].includes(keys[j])
                    ) {
                        contains = true;
                        break;
                    }
                }

                if (contains) {
                    keysToAdd.push(resourceKeys[i]);
                }
            }

            if (keysToAdd.length > 0) {
                keys.push(...keysToAdd);
            }
        }

        let count = 0;

        for (let i = 0; i < keys.length; i++) {
            if (!hasOwnProperty(ctx.data.attributes, keys[i])) {
                continue;
            }

            let outcome : boolean = false;

            const attributeValue = ctx.data.attributes[keys[i]];

            if (
                attributeValue === null &&
                ctx.spec.attributeNullMatchAll
            ) {
                outcome = true;
            } else if (
                attributeValue === ctx.data.identity.realmId ||
                attributeValue === ctx.data.identity.realmName
            ) {
                outcome = true;
            }

            if (outcome) {
                if (ctx.spec.decisionStrategy === DecisionStrategy.AFFIRMATIVE) {
                    return maybeInvertPolicyOutcome(true, ctx.spec.invert);
                }

                count++;
            } else {
                if (ctx.spec.decisionStrategy === DecisionStrategy.UNANIMOUS) {
                    return maybeInvertPolicyOutcome(false, ctx.spec.invert);
                }

                count--;
            }
        }

        return maybeInvertPolicyOutcome(count > 0, ctx.spec.invert);
    }
}
