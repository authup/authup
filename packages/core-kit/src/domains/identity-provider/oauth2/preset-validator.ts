/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import zod from 'zod';
import { IdentityProviderProtocol } from '../constants';
import { getIdentityProviderProtocolForPreset } from '../preset';
import type { OAuth2IdentityProvider } from './types';

export class IdentityProviderOAuth2PresetAttributesValidator extends Container<OAuth2IdentityProvider> {
    protected initialize() {
        super.initialize();

        this.mount(
            'preset',
            createValidator(zod.string().check((ctx) => {
                const protocol = getIdentityProviderProtocolForPreset(ctx.value);

                if (
                    protocol !== IdentityProviderProtocol.OAUTH2 &&
                    protocol !== IdentityProviderProtocol.OIDC
                ) {
                    ctx.issues.push({
                        input: ctx.value,
                        code: 'custom',
                        message: `The resolved protocol should be ${IdentityProviderProtocol.OAUTH2} or ${IdentityProviderProtocol.OIDC}`,
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
    }
}
