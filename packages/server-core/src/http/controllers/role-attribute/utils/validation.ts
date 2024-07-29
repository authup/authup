/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-validator';
import type { ContainerOptions } from 'validup';
import { Container } from 'validup';
import type { RoleAttributeEntity } from '../../../../domains';
import { RequestHandlerOperation } from '../../../request';

export class RoleAttributeRequestValidator extends Container<
RoleAttributeEntity
> {
    constructor(options: ContainerOptions<RoleAttributeEntity> = {}) {
        super(options);

        this.mountAll();
    }

    mountAll() {
        this.mount(
            'name',
            { group: RequestHandlerOperation.CREATE },
            createValidator((chain) => chain
                .exists()
                .notEmpty()
                .isString()
                .isLength({ min: 3, max: 255 })),
        );

        this.mount(
            'role_id',
            { group: RequestHandlerOperation.CREATE },
            createValidator((chain) => chain
                .exists()
                .isUUID()),
        );

        this.mount('value', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 512 })
            .optional({ nullable: true })));
    }
}
