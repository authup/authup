/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    IdentityProviderPreset,
    IdentityProviderProtocol,
    isValidIdentityProviderSub,
} from '@authup/core-kit';
import { BadRequestError } from '@ebec/http';
import { createValidator } from '@validup/adapter-validator';
import type { ContainerOptions } from 'validup';
import { Container } from 'validup';
import type { IdentityProviderEntity } from '../../../../database/domains';
import { RequestHandlerOperation } from '../../../request';

export class IdentityProviderValidator extends Container<IdentityProviderEntity> {
    constructor(options: ContainerOptions<IdentityProviderEntity> = {}) {
        super(options);

        this.mountAll();
    }

    mountAll() {
        this.mount('slug', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 36 })
            .custom((value) => {
                const isValid = isValidIdentityProviderSub(value);
                if (!isValid) {
                    throw new BadRequestError('Only the characters [a-z0-9-_]+ are allowed.');
                }

                return isValid;
            })));

        this.mount('name', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 5, max: 128 })));

        this.mount('display_name', createValidator((chain) => chain
            .isString()
            .isLength({ min: 3, max: 256 })
            .optional({ values: 'null' })));

        const container = new Container({ oneOf: true });
        container.mount('protocol', createValidator((chain) => chain.exists()
            .notEmpty()
            .isIn(Object.values(IdentityProviderProtocol))));

        container.mount('preset', createValidator((chain) => chain.exists()
            .notEmpty()
            .isIn(Object.values(IdentityProviderPreset))));

        this.mount(container);

        this.mount('enabled', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .isBoolean()));

        this.mount('realm_id', { group: RequestHandlerOperation.CREATE }, createValidator((chain) => chain
            .exists()
            .isUUID()
            .optional({ nullable: true })));
    }
}
