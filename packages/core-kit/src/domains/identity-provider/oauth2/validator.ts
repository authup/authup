/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import { z } from 'zod';
import { getIdentityProviderProtocolForPreset } from '../preset';
import type { OAuth2IdentityProvider } from './types';

export class IdentityProviderOAuth2AttributesValidator extends Container<OAuth2IdentityProvider> {
    protected initialize() {
        super.initialize();

        this.mount(
            'preset',
            createValidator(z
                .string()
                .optional()
                .nullable()
                .check((ctx) => {
                    let protocol : string | null | undefined;
                    if (typeof ctx.value === 'string') {
                        protocol = getIdentityProviderProtocolForPreset(ctx.value);
                    }

                    if (typeof protocol === 'string') {
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
            createValidator(z.string().min(3).max(128)),
        );

        this.mount(
            'client_secret',
            { optional: true },
            createValidator(z.string().min(3).max(128).optional()
                .nullable()),
        );

        this.mount(
            'token_url',
            createValidator(z.url()),
        );

        this.mount(
            'token_revoke_url',
            { optional: true },
            createValidator(z.url().optional().nullable()),
        );

        this.mount(
            'authorize_url',
            createValidator(z.url()),
        );

        this.mount(
            'user_info_url',
            { optional: true },
            createValidator(z.url().optional().nullable()),
        );

        this.mount(
            'scope',
            createValidator(z.string().min(3).max(2000).optional()
                .nullable()),
        );
    }
}
