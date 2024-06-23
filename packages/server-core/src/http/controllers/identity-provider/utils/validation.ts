/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    IdentityProviderPreset,
    IdentityProviderProtocol,
    getIdentityProviderProtocolForPreset,
    isValidIdentityProviderSub,
} from '@authup/core-kit';
import { BadRequestError } from '@ebec/http';
import type { Request } from 'routup';
import { ZodError } from 'zod';
import type { RequestValidatorExecuteOptions } from '../../../../core';
import { RequestDatabaseValidator } from '../../../../core';
import {
    IdentityProviderEntity,
    validateLdapIdentityProviderProtocol,
    validateOAuth2IdentityProviderProtocol,
} from '../../../../domains';
import { buildErrorMessageForZodError } from '../../../../utils';
import { RequestHandlerOperation } from '../../../request';

export class IdentityProviderRequestValidator extends RequestDatabaseValidator<IdentityProviderEntity> {
    constructor() {
        super(IdentityProviderEntity);

        this.mount();
    }

    mount() {
        this.add('slug')
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 36 })
            .custom((value) => {
                const isValid = isValidIdentityProviderSub(value);
                if (!isValid) {
                    throw new BadRequestError('Only the characters [a-z0-9-_]+ are allowed.');
                }

                return isValid;
            });

        this.add('name')
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 5, max: 128 });

        this.addOneOf(
            [
                this.create('protocol')
                    .exists()
                    .notEmpty()
                    .isIn(Object.values(IdentityProviderProtocol)),
                this.create('preset')
                    .exists()
                    .notEmpty()
                    .isIn(Object.values(IdentityProviderPreset)),
            ],
        );

        this.add('enabled')
            .exists()
            .notEmpty()
            .isBoolean();

        this.addTo(RequestHandlerOperation.CREATE, 'realm_id')
            .exists()
            .isUUID()
            .optional({ nullable: true });
    }

    async executeWithAttributes(
        req: Request,
        options: RequestValidatorExecuteOptions<IdentityProviderEntity> = {},
    ) : Promise<[IdentityProviderEntity, Record<string, any>]> {
        const data = await this.execute(req, options);

        let protocol : `${IdentityProviderProtocol}` | undefined;
        if (data.preset) {
            protocol = getIdentityProviderProtocolForPreset(data.preset);
        } else {
            protocol = data.protocol;
        }

        if (!protocol) {
            throw new BadRequestError('A protocol could not be determined.');
        }

        let attributes : Record<string, any> = {};

        try {
            switch (protocol) {
                case IdentityProviderProtocol.OAUTH2:
                case IdentityProviderProtocol.OIDC: {
                    attributes = validateOAuth2IdentityProviderProtocol(req, data.preset);
                    break;
                }
                case IdentityProviderProtocol.LDAP: {
                    attributes = validateLdapIdentityProviderProtocol(req);
                    break;
                }
            }
        } catch (e: any) {
            if (e instanceof ZodError) {
                throw new BadRequestError(buildErrorMessageForZodError(e));
            }

            if (e instanceof Error) {
                throw new BadRequestError(e.message, {
                    cause: e,
                });
            }

            throw e;
        }

        return [data, attributes];
    }
}
