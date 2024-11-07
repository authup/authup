/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError } from '@ebec/http';
import { createValidationChain, createValidator } from '@validup/adapter-validator';
import { Container } from 'validup';
import zod from 'zod';
import type { ClientEntity } from '../../../../database/domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { RequestHandlerOperation } from '../../../request';

export class ClientRequestValidator extends Container<ClientEntity> {
    protected initialize() {
        super.initialize();

        const nameValidator = createValidator(() => {
            const chain = createValidationChain();
            return chain
                .isString()
                .isLength({ min: 3, max: 256 });
        });

        this.mount(
            'name',
            { group: RequestHandlerOperation.UPDATE, optional: true },
            nameValidator,
        );

        this.mount(
            'name',
            { group: RequestHandlerOperation.CREATE },
            nameValidator,
        );

        this.mount(
            'display_name',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .isString()
                    .isLength({ min: 3, max: 256 })
                    .optional({ values: 'null' });
            }),
        );

        this.mount(
            'secret',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .notEmpty()
                    .isString()
                    .isLength({ min: 3, max: 256 })
                    .optional({ values: 'null' });
            }),
        );

        this.mount(
            'redirect_uri',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
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
                    .optional({ values: 'null' });
            }),
        );

        this.mount(
            'base_url',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .notEmpty()
                    .isURL()
                    .isLength({ min: 3, max: 2000 })
                    .optional({ values: 'null' });
            }),
        );

        this.mount(
            'root_url',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .notEmpty()
                    .isURL()
                    .isLength({ min: 3, max: 2000 })
                    .optional({ values: 'null' });
            }),
        );

        this.mount(
            'grant_types',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .notEmpty()
                    .isString()
                    .isLength({ min: 3, max: 512 })
                    .optional({ values: 'null' });
            }),
        );

        this.mount(
            'scope',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .notEmpty()
                    .isString()
                    .isLength({ min: 3, max: 512 })
                    .optional({ values: 'null' });
            }),
        );

        this.mount(
            'is_confidential',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isBoolean();
            }),
        );

        this.mount(
            'realm_id',
            { group: RequestHandlerOperation.CREATE, optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isUUID()
                    .optional({ nullable: true });
            }),
        );
    }
}
