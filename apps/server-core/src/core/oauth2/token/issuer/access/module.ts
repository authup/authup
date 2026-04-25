/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';
import { OAuth2TokenKind } from '@authup/specs';
import type { IOAuth2TokenSigner } from '../../signer/index.ts';
import type { IOAuth2TokenRepository } from '../../repository/index.ts';
import { OAuth2BaseTokenIssuer } from '../base.ts';
import type { IOAuth2TokenIssuer, OAuth2TokenIssuerOptions, OAuth2TokenIssuerResponse } from '../types.ts';
import type { IIdentityRoleProvider } from '../../../../identity/index.ts';

export class OAuth2AccessTokenIssuer extends OAuth2BaseTokenIssuer implements IOAuth2TokenIssuer {
    protected repository: IOAuth2TokenRepository;

    protected signer : IOAuth2TokenSigner;

    protected identityRoleProvider?: IIdentityRoleProvider;

    constructor(
        repository: IOAuth2TokenRepository,
        signer: IOAuth2TokenSigner,
        options: OAuth2TokenIssuerOptions = {},
        identityRoleProvider?: IIdentityRoleProvider,
    ) {
        super(options);

        this.repository = repository;
        this.signer = signer;
        this.identityRoleProvider = identityRoleProvider;
    }

    async issue(input: OAuth2TokenPayload = {}) : Promise<OAuth2TokenIssuerResponse> {
        const iss = this.buildIss(input);

        const accessClaims = await this.buildAccessClaims(input);

        const data = await this.repository.insert({
            ...input,
            kind: OAuth2TokenKind.ACCESS,
            exp: this.buildExp(input),
            ...(iss ? { iss } : {}),
            ...accessClaims,
        });

        const token = await this.signer.sign(data);

        await this.repository.saveWithSignature(data, token);

        return [token, data];
    }

    protected async buildAccessClaims(input: OAuth2TokenPayload) : Promise<Pick<OAuth2TokenPayload, 'realm_access' | 'global_access'>> {
        if (!this.identityRoleProvider || !input.sub || !input.sub_kind) {
            return {};
        }

        const roles = await this.identityRoleProvider.getRolesFor({
            type: input.sub_kind,
            id: input.sub,
            clientId: input.client_id,
            realmId: input.realm_id,
            realmName: input.realm_name,
        });

        const realmRoles: string[] = [];
        const globalRoles: string[] = [];

        for (const role of roles) {
            if (!role.realm_id) {
                globalRoles.push(role.name);
            } else if (input.realm_id && role.realm_id === input.realm_id) {
                realmRoles.push(role.name);
            }
        }

        return {
            realm_access: { roles: realmRoles },
            global_access: { roles: globalRoles },
        };
    }
}
