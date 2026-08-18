/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType } from '@authup/access';
import { PolicyValidator } from '@authup/core-kit';
import { createValidator } from '@validup/zod';
import type { ContainerInput, ContainerRunOptions } from 'validup';
import { Container, ValidupError } from 'validup';
import { defineIssueItem } from '@ebec/core';
import { z } from 'zod';
import { ProvisioningStrategyValidator } from '../../strategy/index.ts';
import { createProvisioningEntitiesValidator } from '../utils.ts';
import type { PolicyProvisioningEntity } from './types.ts';

export class PolicyProvisioningValidator extends Container<PolicyProvisioningEntity> {
    override async run(
        input?: ContainerInput<PolicyProvisioningEntity>,
        options?: ContainerRunOptions<PolicyProvisioningEntity>,
    ): Promise<PolicyProvisioningEntity> {
        const output = await super.run(input, options);

        // A composite policy with no children can never be satisfied and makes
        // any permission bound to it permanently un-grantable (#3304). Reject
        // it up front so provisioning fails at config load with a clear
        // message, rather than silently provisioning a "stale" permission that
        // only fails — with an opaque empty-issue error — once evaluated.
        if (
            output.attributes?.type === BuiltInPolicyType.COMPOSITE &&
            (!output.children || output.children.length === 0)
        ) {
            throw new ValidupError([
                defineIssueItem({
                    path: ['children'],
                    message: 'A composite policy must define at least one child policy.',
                }),
            ]);
        }

        return output;
    }

    protected initialize() {
        super.initialize();

        const strategyValidator = new ProvisioningStrategyValidator();
        this.mount('strategy', { optional: true }, strategyValidator);

        const attributesValidator = new PolicyValidator();
        this.mount('attributes', attributesValidator);

        this.mount('extraAttributes', { optional: true }, createValidator(
            z.record(z.string(), z.any()),
        ));

        this.mount('children', { optional: true }, createValidator(
            z
                .array(z.any())
                .check(createProvisioningEntitiesValidator(this)),
        ));
    }
}
