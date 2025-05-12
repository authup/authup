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
    OAuth2Error,
} from '@authup/specs';

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import zod from 'zod';

export class AuthorizeRequestValidator extends Container<OAuth2AuthorizationCodeRequest> {
    protected initialize() {
        super.initialize();

        this.mount(
            'response_type',
            createValidator(
                zod
                    .string()
                    .nonempty()
                    .superRefine((value, ctx) : value is string => {
                        const availableResponseTypes = Object.values(OAuth2AuthorizationResponseType);
                        const responseTypes = value.split(' ') as OAuth2AuthorizationResponseType[];

                        for (let i = 0; i < responseTypes.length; i++) {
                            if (availableResponseTypes.indexOf(responseTypes[i]) === -1) {
                                const error = OAuth2Error.responseTypeUnsupported();
                                ctx.addIssue({
                                    code: 'custom',
                                    message: error.message,
                                });
                            }
                        }

                        return zod.NEVER;
                    }),
            ),
        );

        this.mount(
            'redirect_uri',
            createValidator(zod.string().url()),
        );

        this.mount(
            'scope',
            createValidator(zod.string().min(3).max(512)),
        );

        this.mount(
            'state',
            { optional: true },
            createValidator(zod.string().min(5).max(2048).nullable()),
        );

        this.mount(
            'code_challenge',
            { optional: true },
            createValidator(zod.string().min(1).max(256).nullable()),
        );

        this.mount(
            'code_challenge_method',
            { optional: true },
            createValidator(zod.nativeEnum(OAuth2AuthorizationCodeChallengeMethod).nullable()),
        );

        this.mount(
            'realm_id',
            { optional: true },
            createValidator(zod.string().nonempty()),
        );

        this.mount(
            'client_id',
            createValidator(zod.string().nonempty()),
        );
    }
}
