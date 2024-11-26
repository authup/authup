/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import {
    OAuth2AuthorizationCodeChallengeMethod,
    OAuth2AuthorizationResponseType,
} from '@authup/kit';

import { TokenError } from '@authup/errors';
import { createValidationChain, createValidator } from '@validup/adapter-validator';
import { Container } from 'validup';

export class AuthorizeRequestValidator extends Container<OAuth2AuthorizationCodeRequest> {
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
                        const availableResponseTypes = Object.values(OAuth2AuthorizationResponseType);
                        const responseTypes = value.split(' ');

                        for (let i = 0; i < responseTypes.length; i++) {
                            if (availableResponseTypes.indexOf(responseTypes[i]) === -1) {
                                throw TokenError.responseTypeUnsupported();
                            }
                        }

                        return true;
                    });
            }),
        );

        this.mount(
            'redirect_uri',
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .notEmpty()
                    .isURL()
                    .isLength({ min: 3, max: 2000 });
            }),
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
