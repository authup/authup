/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    IdentityProviderProtocol,
    getIdentityProviderProtocolForPreset,
} from '@authup/core-kit';
import { BadRequestError } from '@ebec/http';
import { buildError } from '@validup/adapter-zod';
import { Container } from 'validup';
import { ZodError } from 'zod';
import {
    validateLdapIdentityProviderProtocol,
    validateOAuth2IdentityProviderProtocol,
} from '../../../../../../domains';

export class IdentityProviderAttributesValidator extends Container {
    override async run(
        input: Record<string, any>,
    ) : Promise<Record<string, any>> {
        let protocol : `${IdentityProviderProtocol}` | undefined;
        if (input.preset) {
            protocol = getIdentityProviderProtocolForPreset(input.preset);
        } else {
            protocol = input.protocol;
        }

        if (!protocol) {
            throw new BadRequestError('A protocol could not be determined.');
        }

        let attributes : Record<string, any> = {};

        try {
            switch (protocol) {
                case IdentityProviderProtocol.OAUTH2:
                case IdentityProviderProtocol.OIDC: {
                    attributes = validateOAuth2IdentityProviderProtocol(input, input.preset);
                    break;
                }
                case IdentityProviderProtocol.LDAP: {
                    attributes = validateLdapIdentityProviderProtocol(input);
                    break;
                }
            }
        } catch (e: any) {
            if (e instanceof ZodError) {
                throw buildError(e, { path: 'protocol' });
            }

            if (e instanceof Error) {
                throw new BadRequestError(e.message, {
                    cause: e,
                });
            }

            throw e;
        }

        return attributes;
    }
}
