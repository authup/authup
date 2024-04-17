/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { IdentityProviderPreset } from '@authup/core-kit';
import { OpenIDIdentityProviderFlow } from './core';
import {
    FacebookIdentityProviderFlow,
    GithubIdentityProviderFlow,
    GoogleIdentityProviderFlow,
    InstagramIdentityProviderFlow,
    PaypalIdentityProviderFlow,
} from './social';
import type { IOAuth2IdentityProviderFlow, OAuth2IdentityProviderFlowOptions } from './types';

export function createOAuth2IdentityProviderFlow(
    provider: OAuth2IdentityProviderFlowOptions,
) : IOAuth2IdentityProviderFlow {
    if (provider.preset === IdentityProviderPreset.FACEBOOK) {
        return new FacebookIdentityProviderFlow(provider);
    }

    if (provider.preset === IdentityProviderPreset.GITHUB) {
        return new GithubIdentityProviderFlow(provider);
    }

    if (provider.preset === IdentityProviderPreset.GOOGLE) {
        return new GoogleIdentityProviderFlow(provider);
    }

    if (provider.preset === IdentityProviderPreset.INSTAGRAM) {
        return new InstagramIdentityProviderFlow(provider);
    }

    if (provider.preset === IdentityProviderPreset.PAYPAL) {
        return new PaypalIdentityProviderFlow(provider);
    }

    return new OpenIDIdentityProviderFlow(provider);
}
