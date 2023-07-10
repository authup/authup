/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { IdentityProviderPreset } from '@authup/core';
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
    if (provider.protocol_config === IdentityProviderPreset.FACEBOOK) {
        return new FacebookIdentityProviderFlow(provider);
    }

    if (provider.protocol_config === IdentityProviderPreset.GITHUB) {
        return new GithubIdentityProviderFlow(provider);
    }

    if (provider.protocol_config === IdentityProviderPreset.GOOGLE) {
        return new GoogleIdentityProviderFlow(provider);
    }

    if (provider.protocol_config === IdentityProviderPreset.INSTAGRAM) {
        return new InstagramIdentityProviderFlow(provider);
    }

    if (provider.protocol_config === IdentityProviderPreset.PAYPAL) {
        return new PaypalIdentityProviderFlow(provider);
    }

    return new OpenIDIdentityProviderFlow(provider);
}
