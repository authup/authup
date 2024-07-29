/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-validator';
import type { ContainerOptions } from 'validup';
import { Container } from 'validup';
import type {
    IdentityProviderRoleMappingEntity,
} from '../../../../domains';
import { RequestHandlerOperation } from '../../../request';

export class IdentityProviderRoleMappingRequestValidator extends Container<
IdentityProviderRoleMappingEntity
> {
    constructor(options: ContainerOptions<IdentityProviderRoleMappingEntity> = {}) {
        super(options);

        this.mountAll();
    }

    mountAll() {
        this.mount(
            'provider_id',
            { group: RequestHandlerOperation.CREATE },
            createValidator((chain) => chain
                .exists()
                .isUUID()),
        );

        this.mount(
            'role_id',
            { group: RequestHandlerOperation.CREATE },
            createValidator((chain) => chain
                .exists()
                .isUUID()),
        );

        this.mount('name', createValidator((chain) => chain
            .optional({ values: 'null' })));

        this.mount('value', createValidator((chain) => chain
            .optional({ values: 'null' })));

        this.mount('value_is_regex', createValidator((chain) => chain
            .isBoolean()
            .optional({ values: 'null' })));
    }
}
