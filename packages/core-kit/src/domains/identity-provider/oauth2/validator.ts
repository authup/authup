/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import zod from 'zod';
import { getIdentityProviderProtocolForPreset } from '../preset';
import type { OAuth2IdentityProvider } from './types';

export class IdentityProviderOAuth2AttributesValidator extends Container<OAuth2IdentityProvider> {
    protected initialize() {
        super.initialize();

        this.mount(
            'preset',
            createValidator(zod
                .string()
                .optional()
                .nullable()
                .check((ctx) => {
                    const protocol = getIdentityProviderProtocolForPreset(ctx.value);
                    if (protocol !== null) {
                        ctx.issues.push({
                            input: ctx.value,
                            code: 'custom',
                            message: 'The preset should not be defined.',
                        });
                    }
                })),
        );

        this.mount(
            'client_id',
            createValidator(zod.string().min(3).max(128)),
        );

        this.mount(
            'client_secret',
            { optional: true },
            createValidator(zod.string().min(3).max(128).optional()
                .nullable()),
        );

        this.mount(
            'token_url',
            createValidator(zod.url()),
        );

        this.mount(
            'token_revoke_url',
            { optional: true },
            createValidator(zod.url().optional().nullable()),
        );

        this.mount(
            'authorize_url',
            createValidator(zod.url()),
        );

        this.mount(
            'user_info_url',
            { optional: true },
            createValidator(zod.url().optional().nullable()),
        );

        this.mount(
            'scope',
            createValidator(zod.string().min(3).max(2000).optional()
                .nullable()),
        );
    }
}
