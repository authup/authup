/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, isObject } from '@authup/kit';
import { DecisionStrategy } from '../../../constants';
import { PolicyError } from '../../error';
import type { PolicyEvaluateContext, PolicyEvaluator } from '../../evaluator';
import type { PolicyInput, PolicyWithType } from '../../types';
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
        return ctx.config.type === BuiltInPolicyType.REALM_MATCH;
    }

    async validateConfig(ctx: PolicyEvaluateContext) : Promise<RealmMatchPolicy> {
        return this.validator.run(ctx.config);
    }

    async validateInput(ctx: PolicyEvaluateContext<RealmMatchPolicy>) : Promise<PolicyInput> {
        if (
            !isObject(ctx.input.attributes) ||
            !isObject(ctx.input.identity)
        ) {
            throw PolicyError.evaluatorContextInvalid();
        }

        return ctx.input;
    }

    async evaluate(ctx: PolicyEvaluateContext<
    RealmMatchPolicy
    >): Promise<boolean> {
        if (!ctx.input.attributes || !ctx.input.identity) {
            throw PolicyError.evaluatorContextInvalid();
        }

        const identityMasterMatchAll = ctx.config.identityMasterMatchAll ?? true;
        if (
            identityMasterMatchAll &&
            ctx.input.identity.realmName &&
            ctx.input.identity.realmName === 'master'
        ) {
            return maybeInvertPolicyOutcome(true, ctx.config.invert);
        }

        let keys : string[];
        if (ctx.config.attributeName) {
            if (Array.isArray(ctx.config.attributeName)) {
                keys = ctx.config.attributeName;
            } else {
                keys = [ctx.config.attributeName];
            }
        } else {
            keys = [
                'realm_id',
                'realm_name',
                'realmId',
                'realmName',
            ];

            ctx.config.decisionStrategy = DecisionStrategy.CONSENSUS;
        }

        const attributeNameStrict = ctx.config.attributeNameStrict ?? true;
        if (!attributeNameStrict) {
            const resourceKeys = Object.keys(ctx.input.attributes);
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
            if (!hasOwnProperty(ctx.input.attributes, keys[i])) {
                continue;
            }

            let outcome : boolean = false;

            const attributeValue = ctx.input.attributes[keys[i]];

            if (
                attributeValue === null &&
                ctx.config.attributeNullMatchAll
            ) {
                outcome = true;
            } else if (
                attributeValue === ctx.input.identity.realmId ||
                attributeValue === ctx.input.identity.realmName
            ) {
                outcome = true;
            }

            if (outcome) {
                if (ctx.config.decisionStrategy === DecisionStrategy.AFFIRMATIVE) {
                    return maybeInvertPolicyOutcome(true, ctx.config.invert);
                }

                count++;
            } else {
                if (ctx.config.decisionStrategy === DecisionStrategy.UNANIMOUS) {
                    return maybeInvertPolicyOutcome(false, ctx.config.invert);
                }

                count--;
            }
        }

        return maybeInvertPolicyOutcome(count > 0, ctx.config.invert);
    }
}
