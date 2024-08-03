/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError } from '@ebec/http';
import { createValidator } from '@validup/adapter-validator';
import type { ContainerOptions } from 'validup';
import { Container } from 'validup';
import zod from 'zod';
import type { ClientEntity } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { RequestHandlerOperation } from '../../../request';

export class ClientRequestValidator extends Container<ClientEntity> {
    constructor(options: ContainerOptions<ClientEntity> = {}) {
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

        this.mount('secret', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 256 })
            .optional({ nullable: true })));

        this.mount('redirect_uri', createValidator((chain) => chain
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
            .optional({ nullable: true })));

        this.mount('base_url', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .isURL()
            .isLength({ min: 3, max: 2000 })
            .optional({ nullable: true })));

        this.mount('root_url', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .isURL()
            .isLength({ min: 3, max: 2000 })
            .optional({ nullable: true })));

        this.mount('grant_types', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 512 })
            .optional({ nullable: true })));

        this.mount('scope', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 512 })
            .optional({ nullable: true })));

        this.mount('is_confidential', createValidator((chain) => chain
            .exists()
            .isBoolean()
            .optional()));

        this.mount('realm_id', { group: RequestHandlerOperation.CREATE }, createValidator((chain) => chain
            .exists()
            .isUUID()
            .optional({ nullable: true })
            .default(null)));
    }
}
