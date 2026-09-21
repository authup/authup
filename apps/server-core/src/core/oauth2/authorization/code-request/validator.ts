/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import {
    OAuth2AuthorizationCodeChallengeMethod,
    OAuth2AuthorizationPrompt,
    OAuth2AuthorizationResponseType,
    OAuth2RequestError,
    OAuth2ResponseTypeError,
} from '@authup/specs';

import { createValidator } from '@validup/zod';
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
                        // OAuth 2.1 posture: the authorization endpoint issues
                        // codes only — the implicit/hybrid response types
                        // (token, id_token, none) are not supported.
                        const responseTypes = ctx.value.split(' ').filter(Boolean);

                        const invalid = responseTypes.length !== 1 ||
                            responseTypes[0] !== OAuth2AuthorizationResponseType.CODE;

                        if (invalid) {
                            const error = OAuth2ResponseTypeError.unsupported();
                            ctx.issues.push({
                                input: ctx.value,
                                code: 'custom',
                                message: error.message,
                            });
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
            'nonce',
            { optional: true },
            createValidator(z.string().min(1).max(512).nullable()),
        );

        this.mount(
            'prompt',
            { optional: true },
            createValidator(
                z
                    .string()
                    .min(1)
                    .max(128)
                    .nullable()
                    .check((ctx) => {
                        if (!ctx.value) {
                            return z.NEVER;
                        }

                        // Unknown tokens are ignored (forward-compat). Only the
                        // OIDC §3.1.2.1 rule "none must not be combined" is enforced.
                        const values = ctx.value.split(' ').filter(Boolean);
                        if (
                            values.includes(OAuth2AuthorizationPrompt.NONE) &&
                            values.length > 1
                        ) {
                            const error = OAuth2RequestError.malformed(
                                'prompt=none must not be combined with other prompt values.',
                            );
                            ctx.issues.push({
                                input: ctx.value,
                                code: 'custom',
                                message: error.message,
                            });
                        }

                        return z.NEVER;
                    }),
            ),
        );

        this.mount(
            'max_age',
            { optional: true },
            createValidator(
                z.preprocess(
                    // An empty / blank max_age (e.g. a stray `?max_age=` from an
                    // RP template) is absent, not `max_age=0` — without this
                    // z.coerce.number('') === 0 would silently force
                    // re-authentication on every request for that RP.
                    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
                    z.coerce.number().int().min(0).nullable().optional(),
                ),
            ),
        );

        this.mount(
            'login_hint',
            { optional: true },
            createValidator(z.string().trim().toLowerCase().min(1).max(256).nullable()),
        );

        // case-sensitive (urn values) — no toLowerCase, unlike login_hint
        this.mount(
            'acr_values',
            { optional: true },
            createValidator(z.string().trim().min(1).max(256).nullable()),
        );

        // OIDC Core §3.1.2.1: space-delimited BCP47 tags, most preferred
        // first. A preference and never a demand (§5.5.1.1 reasoning applies
        // here too) — the hosted pages take the first tag they can use and a
        // choice already made on this origin outranks it, so the charset is
        // the whole of the validation.
        this.mount(
            'ui_locales',
            { optional: true },
            createValidator(z.string().trim().min(2).max(256).regex(
                /^[a-zA-Z0-9-]+( [a-zA-Z0-9-]+)*$/,
                'must be a space-delimited list of BCP47 language tags',
            ).nullable()),
        );

        // authup's own companion to `ui_locales`, and one value rather than a
        // list: there is nothing to negotiate about a color mode.
        //
        // Shape only, no enum of `light|dark|system`. This validator refuses a
        // malformed request and leaves unknown VALUES to the consumer, which
        // is why `prompt` and `acr_values` tolerate tokens they do not know.
        // A cosmetic hint must not be able to fail a login: the page renders
        // the three it knows and ignores anything else.
        this.mount(
            'ui_color_mode',
            { optional: true },
            createValidator(z.string().trim().min(1).max(32).nullable()),
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
