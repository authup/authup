/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { IdentityProviderPreset } from '@authup/core-kit';
import type { IdentityProviderPresetElement } from './type';

const elements = {
    [IdentityProviderPreset.FACEBOOK]: {
        name: 'Facebook',
        icon: 'fa6-brands:facebook',
    },
    [IdentityProviderPreset.GITHUB]: {
        name: 'GitHub',
        icon: 'fa6-brands:github',
    },
    [IdentityProviderPreset.GITLAB]: {
        name: 'GitLab',
        icon: 'fa6-brands:gitlab',
    },
    [IdentityProviderPreset.GOOGLE]: {
        name: 'Google',
        icon: 'fa6-brands:google',
    },
    [IdentityProviderPreset.PAYPAL]: {
        name: 'Paypal',
        icon: 'fa6-brands:paypal',
    },
    [IdentityProviderPreset.INSTAGRAM]: {
        name: 'Instagram',
        icon: 'fa6-brands:instagram',
    },
    [IdentityProviderPreset.STACKOVERFLOW]: {
        name: 'StackOverflow',
        icon: 'fa6-brands:stack-overflow',
    },
    [IdentityProviderPreset.TWITTER]: {
        name: 'Twitter',
        icon: 'fa6-brands:twitter',
    },
};

export function getIdentityProviderPresetElement(
    id: `${IdentityProviderPreset}`,
) : IdentityProviderPresetElement | undefined {
    return elements[id];
}
