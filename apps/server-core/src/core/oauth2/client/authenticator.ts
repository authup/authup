/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';
import { IdentityType } from '@authup/core-kit';
import { OAuth2Error } from '@authup/specs';
import { ClientCredentialsService } from '../../authentication/credential/index.ts';
import type { IIdentityResolver } from '../../identity/index.ts';

/**
 * Authenticates a client at the OAuth2 token endpoint. Confidential clients
 * MUST present a valid client_secret (RFC 6749 §3.2.1, §4.1.3, §4.3.2, §6);
 * public clients identify via client_id only.
 *
 * Used by authorization_code, refresh_token, and password grants.
 */
export class OAuth2ClientAuthenticator {
    protected identityResolver: IIdentityResolver;

    protected credentialsService: ClientCredentialsService;

    constructor(identityResolver: IIdentityResolver) {
        this.identityResolver = identityResolver;
        this.credentialsService = new ClientCredentialsService();
    }

    async authenticate(
        clientId: string | undefined,
        clientSecret?: string,
        realmId?: string,
    ): Promise<Client> {
        if (!clientId) {
            throw OAuth2Error.clientInvalid();
        }

        const identity = await this.identityResolver.resolve(IdentityType.CLIENT, clientId, realmId);
        if (!identity || identity.type !== IdentityType.CLIENT) {
            throw OAuth2Error.clientInvalid();
        }

        if (!identity.data.active) {
            throw OAuth2Error.clientInactive();
        }

        if (identity.data.is_confidential) {
            if (!clientSecret) {
                throw OAuth2Error.clientInvalid();
            }

            const verified = await this.credentialsService.verify(clientSecret, identity.data);
            if (!verified) {
                throw OAuth2Error.clientInvalid();
            }
        }

        return identity.data;
    }
}
