/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RealmValidator } from '@authup/core-kit';
import { isObject } from '@authup/kit';
import type { ContainerInput, ContainerRunOptions } from 'validup';
import { Container } from 'validup';
import { REALM_WILDCARD_NAME } from '../../constants.ts';
import { ProvisioningStrategyValidator } from '../../strategy/index.ts';
import { RealmProvisioningRelationsValidator } from './relations-validator.ts';
import { RealmWildcardProvisioningValidator } from './wildcard-validator.ts';

import type { RealmProvisioningEntity } from './types.ts';

export class RealmProvisioningValidator extends Container<RealmProvisioningEntity> {
    protected wildcardValidator = new RealmWildcardProvisioningValidator();

    protected initialize() {
        super.initialize();

        const strategyValidator = new ProvisioningStrategyValidator();
        this.mount('strategy', { optional: true }, strategyValidator);

        const attributesValidator = new RealmValidator();
        this.mount('attributes', attributesValidator);

        const relationsValidator = new RealmProvisioningRelationsValidator();
        this.mount('relations', { optional: true }, relationsValidator);
    }

    /**
     * A realm entry named with the literal wildcard ('*') is a selector
     * over all realms and follows its own, stricter contract — dispatch it
     * to the wildcard validator. Anything else (including partial patterns
     * like 'tenant-*') runs the regular realm validation, where a
     * non-name-safe character fails the name check.
     */
    override async run(
        input?: ContainerInput<RealmProvisioningEntity>,
        options?: ContainerRunOptions<RealmProvisioningEntity>,
    ): Promise<RealmProvisioningEntity> {
        if (
            isObject(input) &&
            isObject(input.attributes) &&
            input.attributes.name === REALM_WILDCARD_NAME
        ) {
            return this.wildcardValidator.run(input, options);
        }

        return super.run(input, options);
    }
}
