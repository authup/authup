/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isRealmNameValid } from '@authup/core-kit';
import { BadRequestError } from '@ebec/http';
import { createValidationChain, createValidator } from '@validup/adapter-validator';
import type { ContainerOptions } from 'validup';
import { Container } from 'validup';
import type { RealmEntity } from '../../../../database/domains';
import { RequestHandlerOperation } from '../../../request';

export class RealmRequestValidator extends Container<
RealmEntity
> {
    constructor(options: ContainerOptions<RealmEntity> = {}) {
        super(options);

        this.mountAll();
    }

    mountAll() {
        const nameValidator = createValidator(() => {
            const chain = createValidationChain();
            return chain
                .exists()
                .notEmpty()
                .isString()
                .isLength({
                    min: 3,
                    max: 128,
                })
                .custom((value) => {
                    const isValid = isRealmNameValid(value);
                    if (!isValid) {
                        throw new BadRequestError('Only the characters [A-Za-z0-9-_]+ are allowed.');
                    }

                    return isValid;
                });
        });

        this.mount('name', { group: RequestHandlerOperation.CREATE }, nameValidator);
        this.mount('name', { group: RequestHandlerOperation.UPDATE, optional: true }, nameValidator);

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
            'description',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .optional({ values: 'null' })
                    .notEmpty()
                    .isString()
                    .isLength({ min: 5, max: 4096 });
            }),
        );
    }
}
