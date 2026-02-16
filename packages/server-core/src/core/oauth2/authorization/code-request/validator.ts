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
import { z } from 'zod';

export class OAuth2AuthorizationCodeRequestValidator extends Container<OAuth2AuthorizationCodeRequest> {
    protected initialize() {
        super.initialize();

        this.mount(
            'response_type',
            createValidator(
                z
                    .string()
                    .nonempty()
                    .check((ctx) => {
                        const availableResponseTypes = Object.values(OAuth2AuthorizationResponseType);
                        const responseTypes = ctx.value.split(' ') as OAuth2AuthorizationResponseType[];

                        for (let i = 0; i < responseTypes.length; i++) {
                            if (availableResponseTypes.indexOf(responseTypes[i]) === -1) {
                                const error = OAuth2Error.responseTypeUnsupported();
                                ctx.issues.push({
                                    input: responseTypes[i],
                                    code: 'custom',
                                    message: error.message,
                                });
                            }
                        }

                        return z.NEVER;
                    }),
            ),
        );

        this.mount(
            'redirect_uri',
            createValidator(z.string().url()),
        );

        this.mount(
            'scope',
            createValidator(z.string().min(3).max(512)),
        );

        this.mount(
            'state',
            { optional: true },
            createValidator(z.string().min(5).max(2048).nullable()),
        );

        this.mount(
            'code_challenge',
            { optional: true },
            createValidator(z.string().min(1).max(256).nullable()),
        );

        this.mount(
            'code_challenge_method',
            { optional: true },
            createValidator(z.enum(OAuth2AuthorizationCodeChallengeMethod).nullable()),
        );

        this.mount(
            'realm_id',
            { optional: true },
            createValidator(z.string().nonempty()),
        );

        this.mount(
            'client_id',
            createValidator(z.string().nonempty()),
        );
    }
}
