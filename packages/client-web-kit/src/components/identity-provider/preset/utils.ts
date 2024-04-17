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
        name: 'Facebook', icon: 'fab fa-facebook',
    },
    [IdentityProviderPreset.GITHUB]: {
        name: 'GitHub', icon: 'fab fa-github',
    },
    [IdentityProviderPreset.GITLAB]: {
        name: 'GitLab', icon: 'fab fa-gitlab',
    },
    [IdentityProviderPreset.GOOGLE]: {
        name: 'Google', icon: 'fab fa-google',
    },
    [IdentityProviderPreset.PAYPAL]: {
        name: 'Paypal', icon: 'fab fa-paypal',
    },
    [IdentityProviderPreset.INSTAGRAM]: {
        name: 'Instagram', icon: 'fab fa-instagram',
    },
    [IdentityProviderPreset.STACKOVERFLOW]: {
        name: 'StackOverflow', icon: 'fa fa-code',
    },
    [IdentityProviderPreset.TWITTER]: {
        name: 'Twitter', icon: 'fab fa-twitter',
    },
};

export function getIdentityProviderPresetElement(
    id: `${IdentityProviderPreset}`,
) : IdentityProviderPresetElement | undefined {
    return elements[id];
}
