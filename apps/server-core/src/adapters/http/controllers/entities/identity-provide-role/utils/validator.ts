/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidationChain, createValidator } from '@validup/adapter-validator';
import { Container } from 'validup';
import type {
    IdentityProviderRoleMappingEntity,
} from '../../../../../database/domains/index.ts';
import { RequestHandlerOperation } from '../../../../request/index.ts';

export class IdentityProviderRoleMappingRequestValidator extends Container<
IdentityProviderRoleMappingEntity
> {
    protected initialize() {
        super.initialize();

        this.mount(
            'provider_id',
            { group: RequestHandlerOperation.CREATE },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isUUID();
            }),
        );

        this.mount(
            'role_id',
            { group: RequestHandlerOperation.CREATE },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isUUID();
            }),
        );

        this.mount(
            'name',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .isString()
                    .optional({ values: 'null' });
            }),
        );

        this.mount(
            'value',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .isString()
                    .optional({ values: 'null' });
            }),
        );

        this.mount(
            'value_is_regex',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .isBoolean();
            }),
        );
    }
}
