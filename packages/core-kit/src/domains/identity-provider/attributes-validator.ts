/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type { ContainerOptions } from 'validup';
import { Container } from 'validup';
import { IdentityProviderLDAPAttributesValidator } from './ldap';
import { IdentityProviderOAuth2AttributesValidator, IdentityProviderOAuth2PresetAttributesValidator } from './oauth2';

export class IdentityProviderAttributesValidator extends Container {
    constructor(options: ContainerOptions<ObjectLiteral> = {}) {
        super({
            ...options,
            oneOf: true,
        });
    }

    protected initialize() {
        super.initialize();

        this.mount(new IdentityProviderLDAPAttributesValidator());
        this.mount(new IdentityProviderOAuth2AttributesValidator());
        this.mount(new IdentityProviderOAuth2PresetAttributesValidator());
    }
}
