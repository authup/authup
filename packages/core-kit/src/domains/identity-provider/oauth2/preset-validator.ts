/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import { IdentityProviderProtocol } from '../constants';
import { getIdentityProviderProtocolForPreset } from '../preset';
import type { OAuth2IdentityProvider } from './types';

export class IdentityProviderOAuth2PresetAttributesValidator extends Container<OAuth2IdentityProvider> {
    protected override initialize() {
        super.initialize();

        this.mount(
            'preset',
            createValidator(z.string().check((ctx) => {
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
            'clientId',
            createValidator(z.string().min(3).max(128)),
        );

        this.mount(
            'clientSecret',
            { optional: true },
            createValidator(z.string().min(3).max(128).optional()
                .nullable()),
        );

        this.mount(
            'scope',
            { optional: true },
            createValidator(z.string().min(3).max(2000).optional()
                .nullable()),
        );

        // Upstream assurance allow-lists (opt-in, both null = trust the
        // provider unconditionally). A single `acr` value may be as short as
        // `"1"`, so unlike `scope` these have no lower bound beyond non-empty
        // - but the value has to carry a token, since a list of separators
        // parses to nothing and would silently disable the check.
        this.mount(
            'requiredAmr',
            { optional: true },
            createValidator(z.string().min(1).max(2000).regex(/[^\s,]/)
                .optional()
                .nullable()),
        );

        this.mount(
            'requiredAcr',
            { optional: true },
            createValidator(z.string().min(1).max(2000).regex(/[^\s,]/)
                .optional()
                .nullable()),
        );
    }
}
