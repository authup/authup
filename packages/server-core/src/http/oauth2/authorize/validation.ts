/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2AuthorizationCodeChallengeMethod,
    OAuth2AuthorizationResponseType,
    OAuth2Error,
} from '@authup/specs';

import { createValidator as createZodValidator } from '@validup/adapter-zod';
import { createValidationChain, createValidator } from '@validup/adapter-validator';
import { Container, ValidupValidatorError } from 'validup';
import zod from 'zod';
import type { OAuth2AuthorizationCodeRequestExtended } from './types';

export class AuthorizeRequestValidator extends Container<OAuth2AuthorizationCodeRequestExtended> {
    protected initialize() {
        super.initialize();

        this.mount(
            'response_type',
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isString()
                    .notEmpty()
                    .custom((value) => {
                        if (typeof value !== 'string') {
                            throw new ValidupValidatorError({
                                path: 'response_type',
                                expected: 'string',
                            });
                        }

                        const availableResponseTypes = Object.values(OAuth2AuthorizationResponseType);
                        const responseTypes = value.split(' ') as OAuth2AuthorizationResponseType[];

                        for (let i = 0; i < responseTypes.length; i++) {
                            if (availableResponseTypes.indexOf(responseTypes[i]) === -1) {
                                throw OAuth2Error.responseTypeUnsupported();
                            }
                        }

                        return true;
                    });
            }),
        );

        this.mount(
            'redirect_uri',
            createZodValidator(zod.string().url()),
        );

        this.mount(
            'scope',
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .notEmpty()
                    .isString()
                    .isLength({ min: 3, max: 512 });
            }),
        );

        this.mount(
            'state',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .notEmpty()
                    .isString()
                    .isLength({ min: 5, max: 2048 })
                    .optional({ values: 'null' });
            }),
        );

        this.mount(
            'code_challenge',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();

                return chain
                    .isString()
                    .isLength({ max: 256 })
                    .optional({ values: 'null' });
            }),
        );

        this.mount(
            'code_challenge_method',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();

                return chain
                    .isString()
                    .isIn(Object.values(OAuth2AuthorizationCodeChallengeMethod))
                    .optional({ values: 'null' });
            }),
        );

        this.mount(
            'client_id',
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .notEmpty()
                    .isString()
                    .isUUID();
            }),
        );
    }
}
