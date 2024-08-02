/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-validator';
import type { ContainerOptions } from 'validup';
import { Container } from 'validup';
import type { ScopeEntity } from '../../../../domains';
import { RequestHandlerOperation } from '../../../request';

export class ScopeRequestValidator extends Container<
ScopeEntity
> {
    constructor(options: ContainerOptions<ScopeEntity> = {}) {
        super(options);

        this.mountAll();
    }

    mountAll() {
        this.mount(
            'name',
            { group: RequestHandlerOperation.UPDATE },
            createValidator((chain) => chain
                .isString()
                .isLength({ min: 3, max: 256 })
                .optional({ values: 'undefined' })),
        );

        this.mount(
            'name',
            { group: RequestHandlerOperation.CREATE },
            createValidator((chain) => chain
                .isString()
                .isLength({ min: 3, max: 256 })),
        );

        this.mount('display_name', createValidator((chain) => chain
            .isString()
            .isLength({ min: 3, max: 256 })
            .optional({ values: 'null' })));

        this.mount('description', createValidator((chain) => chain
            .optional({ nullable: true })
            .notEmpty()
            .isString()
            .isLength({ min: 5, max: 4096 })));

        this.mount('realm_id', { group: RequestHandlerOperation.CREATE }, createValidator((chain) => chain
            .isUUID()
            .optional({ values: 'null' })));
    }
}
