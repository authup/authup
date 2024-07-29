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
    UserRoleEntity,
} from '../../../../domains';

import { RequestHandlerOperation } from '../../../request';

export class UserRoleRequestValidator extends Container<
UserRoleEntity
> {
    constructor(options: ContainerOptions<UserRoleEntity> = {}) {
        super(options);

        this.mountAll();
    }

    mountAll() {
        this.mount(
            'user_id',
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
    }
}
