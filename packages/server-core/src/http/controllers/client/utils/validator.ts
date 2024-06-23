/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError } from '@ebec/http';
import type { ValidationChain } from 'express-validator';
import zod from 'zod';
import { RequestDatabaseValidator } from '../../../../core';
import { ClientEntity } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { RequestHandlerOperation } from '../../../request';

export class ClientRequestValidator extends RequestDatabaseValidator<ClientEntity> {
    constructor() {
        super(ClientEntity);

        this.mount();
    }

    mount() {
        this.mountName();

        this.add('secret')
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 256 })
            .optional({ nullable: true });

        this.add('redirect_uri')
            .exists()
            .notEmpty()
            .isString()
            .custom((value) => {
                const validator = zod.string().url();
                const urls = value.split(',');
                for (let i = 0; i < urls.length; i++) {
                    const output = validator.safeParse(urls[i]);
                    if (!output.success) {
                        throw new BadRequestError(buildErrorMessageForAttribute('redirect_uri'));
                    }
                }

                return true;
            })
            .optional({ nullable: true });

        this.add('base_url')
            .exists()
            .notEmpty()
            .isURL()
            .isLength({ min: 3, max: 2000 })
            .optional({ nullable: true });

        this.add('root_url')
            .exists()
            .notEmpty()
            .isURL()
            .isLength({ min: 3, max: 2000 })
            .optional({ nullable: true });

        this.add('grant_types')
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 512 })
            .optional({ nullable: true });

        this.add('scope')
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 512 })
            .optional({ nullable: true });

        this.add('is_confidential')
            .exists()
            .isBoolean()
            .optional();

        this.addTo(RequestHandlerOperation.CREATE, 'realm_id')
            .exists()
            .isUUID()
            .optional({ nullable: true })
            .default(null);
    }

    mountName() {
        const extendNameChain = (chain: ValidationChain) => {
            chain
                .isString()
                .isLength({ min: 3, max: 256 });
        };

        // on creation, it must be defined
        const nameCreate = this.add('name');
        extendNameChain(nameCreate);
        this.addTo(RequestHandlerOperation.CREATE, nameCreate);

        // on update, it can be missing
        const nameUpdate = this.add('name')
            .optional({ values: 'undefined' });
        extendNameChain(nameUpdate);
        this.addTo(RequestHandlerOperation.UPDATE, nameUpdate);
    }
}
