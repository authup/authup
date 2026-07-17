/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    type Client,
    ClientAuthMethod,
    ClientTokenBindingMethod,
    IdentityType,
} from '@authup/core-kit';
import type { OAuth2TokenConfirmation } from '@authup/specs';
import { OAuth2ClientError } from '@authup/specs';
import { isValidationError } from '@authup/errors';
import { ClientCredentialsService } from '../../authentication/credential/index.ts';
import type {
    ClientCertificateEvidence,
    IClientCertificateValidator,
} from '../../client-certificate/index.ts';
import type { IIdentityResolver } from '../../identity/index.ts';

export type OAuth2ClientAuthenticatorContext = {
    identityResolver: IIdentityResolver,
    certificateValidator: IClientCertificateValidator,
};

/**
 * Authenticates a client at the OAuth2 token endpoint according to its
 * exclusive method: public id only, shared secret, or trusted TLS evidence.
 *
 * Used by every standard client-resolving grant.
 */
export class OAuth2ClientAuthenticator {
    protected identityResolver: IIdentityResolver;

    protected credentialsService: ClientCredentialsService;

    protected certificateValidator?: IClientCertificateValidator;

    constructor(ctx: IIdentityResolver | OAuth2ClientAuthenticatorContext) {
        if ('identityResolver' in ctx) {
            this.identityResolver = ctx.identityResolver;
            this.certificateValidator = ctx.certificateValidator;
        } else {
            // Kept as a compatibility seam for focused secret/public-client
            // unit tests. Production wiring always supplies the validator.
            this.identityResolver = ctx;
        }
        this.credentialsService = new ClientCredentialsService();
    }

    async authenticate(
        clientId: string | undefined,
        clientSecret?: string,
        realmId?: string,
        certificateEvidence?: ClientCertificateEvidence,
    ): Promise<Client> {
        if (!clientId) {
            throw OAuth2ClientError.invalid();
        }

        const client = await this.resolve(clientId, realmId);

        switch (client.authMethod) {
            case ClientAuthMethod.NONE:
                if (typeof clientSecret === 'string') {
                    throw OAuth2ClientError.invalid();
                }
                break;
            case ClientAuthMethod.SECRET: {
                if (!clientSecret) {
                    throw OAuth2ClientError.invalid();
                }

                const verified = await this.credentialsService.verify(clientSecret, client);
                if (!verified) {
                    throw OAuth2ClientError.invalid();
                }
                break;
            }
            case ClientAuthMethod.TLS:
                if (
                    typeof clientSecret === 'string' ||
                    !certificateEvidence ||
                    !this.certificateValidator
                ) {
                    throw OAuth2ClientError.invalid();
                }

                try {
                    await this.certificateValidator.validateForAuthentication(client, certificateEvidence);
                } catch (e) {
                    // A validation failure deliberately reveals neither the
                    // certificate identity nor which realm anchor failed. An
                    // infrastructure fault (e.g. the trust-anchor store being
                    // unreachable) must NOT masquerade as a bad certificate —
                    // let it surface as a server error instead.
                    if (isValidationError(e)) {
                        throw OAuth2ClientError.invalid();
                    }
                    throw e;
                }
                break;
            default:
                throw OAuth2ClientError.invalid();
        }

        return client;
    }

    async resolve(clientId: string, realmId?: string): Promise<Client> {
        const identity = await this.identityResolver.resolve(IdentityType.CLIENT, clientId, realmId);
        if (!identity || identity.type !== IdentityType.CLIENT) {
            throw OAuth2ClientError.invalid();
        }

        if (!identity.data.active) {
            throw OAuth2ClientError.inactive();
        }

        return identity.data;
    }

    resolveTokenBinding(
        client: Pick<Client, 'tokenBindingMethod'>,
        certificateEvidence?: ClientCertificateEvidence,
    ): OAuth2TokenConfirmation | undefined {
        if (client.tokenBindingMethod === ClientTokenBindingMethod.NONE) {
            return undefined;
        }

        if (client.tokenBindingMethod !== ClientTokenBindingMethod.TLS) {
            throw OAuth2ClientError.invalid();
        }

        return this.validateCertificateEvidenceForBinding(certificateEvidence);
    }

    validateCertificateEvidenceForBinding(
        certificateEvidence?: ClientCertificateEvidence,
    ): OAuth2TokenConfirmation {
        if (!certificateEvidence || !this.certificateValidator) {
            throw OAuth2ClientError.invalid();
        }

        try {
            this.certificateValidator.validateForBinding(certificateEvidence);
        } catch {
            throw OAuth2ClientError.invalid();
        }

        return { 'x5t#S256': certificateEvidence.thumbprint };
    }
}
