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
import { createValidationChain, createValidator } from '@validup/adapter-validator';
import { Container } from 'validup';
import type { IdentityProviderEntity } from '../../../../database/domains';
import { RequestHandlerOperation } from '../../../request';

export class IdentityProviderValidator extends Container<IdentityProviderEntity> {
    protected initialize() {
        super.initialize();

        const slugValidator = createValidator(() => {
            const chain = createValidationChain();
            return chain
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
                });
        });
        this.mount(
            'slug',
            { group: RequestHandlerOperation.CREATE },
            slugValidator,
        );
        this.mount(
            'slug',
            { group: RequestHandlerOperation.UPDATE, optional: true },
            slugValidator,
        );

        const nameValidator = createValidator(() => {
            const chain = createValidationChain();
            return chain
                .exists()
                .notEmpty()
                .isString()
                .isLength({ min: 5, max: 128 });
        });
        this.mount(
            'name',
            { group: RequestHandlerOperation.CREATE },
            nameValidator,
        );
        this.mount(
            'name',
            { group: RequestHandlerOperation.UPDATE, optional: true },
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

        const container = new Container({ oneOf: true });
        container.mount(
            'protocol',
            createValidator(() => {
                const chain = createValidationChain();
                return chain.exists()
                    .notEmpty()
                    .isIn(Object.values(IdentityProviderProtocol));
            }),
        );

        container.mount(
            'preset',
            createValidator(() => {
                const chain = createValidationChain();
                return chain.exists()
                    .notEmpty()
                    .isIn(Object.values(IdentityProviderPreset));
            }),
        );

        this.mount({ group: RequestHandlerOperation.CREATE }, container);

        const enabledValidator = createValidator(() => {
            const chain = createValidationChain();
            return chain
                .exists()
                .notEmpty()
                .isBoolean();
        });
        this.mount(
            'enabled',
            { group: RequestHandlerOperation.CREATE },
            enabledValidator,
        );
        this.mount(
            'enabled',
            { group: RequestHandlerOperation.UPDATE, optional: true },
            enabledValidator,
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
