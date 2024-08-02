/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-validator';
import type { ContainerOptions, Validator } from 'validup';
import { Container } from 'validup';
import type { PermissionEntity } from '../../../../domains';
import { RequestHandlerOperation } from '../../../request';

export class PermissionRequestValidator extends Container<
PermissionEntity
> {
    constructor(options: ContainerOptions<PermissionEntity> = {}) {
        super(options);

        this.mountAll();
    }

    mountAll() {
        const nameChain = (optional?: boolean) : Validator => createValidator((chain) => {
            const output = chain
                .exists()
                .notEmpty()
                .isString()
                .isLength({
                    min: 3,
                    max: 128,
                });

            if (optional) {
                return output.optional({ values: 'null' });
            }

            return output;
        });

        this.mount('name', { group: RequestHandlerOperation.CREATE }, nameChain());
        this.mount('name', { group: RequestHandlerOperation.UPDATE }, nameChain(true));

        this.mount('display_name', createValidator((chain) => chain
            .isString()
            .isLength({ min: 3, max: 256 })
            .optional({ values: 'null' })));

        this.mount('description', createValidator((chain) => chain
            .isString()
            .isLength({ min: 5, max: 4096 })
            .optional({ values: 'null' })));

        this.mount('client_id', createValidator((chain) => chain
            .isUUID()
            .optional({ values: 'null' })));

        this.mount('realm_id', { group: RequestHandlerOperation.CREATE }, createValidator((chain) => chain
            .isUUID()
            .optional({ values: 'null' })));

        this.mount('policy_id', createValidator((chain) => chain
            .optional({ values: 'null' })
            .isUUID()));
    }
}
