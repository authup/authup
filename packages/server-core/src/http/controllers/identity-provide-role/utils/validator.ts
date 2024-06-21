/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RequestDatabaseValidator } from '../../../../core';
import {
    IdentityProviderRoleMappingEntity,
} from '../../../../domains';
import { RequestHandlerOperation } from '../../../request';

export class IdentityProviderRoleMappingRequestValidator extends RequestDatabaseValidator<
IdentityProviderRoleMappingEntity
> {
    constructor() {
        super(IdentityProviderRoleMappingEntity);

        this.mount();
    }

    mount() {
        this.addTo(RequestHandlerOperation.CREATE, 'provider_id')
            .exists()
            .isUUID();

        this.addTo(RequestHandlerOperation.CREATE, 'role_id')
            .exists()
            .isUUID();

        this.add('name')
            .optional({ values: 'null' });

        this.add('value')
            .optional({ values: 'null' })
            .default(null);

        this.add('value_is_regex')
            .notEmpty()
            .isBoolean();
    }
}
