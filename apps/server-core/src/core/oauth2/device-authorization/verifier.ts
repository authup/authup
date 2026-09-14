/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2AccessDeniedError, OAuth2DeviceAuthorizationError, OAuth2GrantError } from '@authup/specs';
import { OAuth2DeviceCodeStatus } from './types.ts';
import type {
    IOAuth2DeviceCodeRepository,
    IOAuth2DeviceCodeVerifier,
    OAuth2DeviceCodeApproved,
    OAuth2DeviceCodeVerifierContext,
    OAuth2DeviceCodeVerifyOptions,
} from './types.ts';

export class OAuth2DeviceCodeVerifier implements IOAuth2DeviceCodeVerifier {
    protected repository : IOAuth2DeviceCodeRepository;

    constructor(ctx: OAuth2DeviceCodeVerifierContext) {
        this.repository = ctx.repository;
    }

    async verify(deviceCode: string, options: OAuth2DeviceCodeVerifyOptions) : Promise<OAuth2DeviceCodeApproved> {
        const entity = await this.repository.findOneById(deviceCode);
        if (!entity) {
            throw OAuth2GrantError.invalid();
        }

        if (entity.client_id !== options.clientId || entity.realm_id !== options.realmId) {
            throw OAuth2GrantError.invalid();
        }

        if (entity.expires_at <= Math.floor(Date.now() / 1000)) {
            await this.repository.removeById(entity.id);
            throw OAuth2DeviceAuthorizationError.expired();
        }

        if (!await this.repository.touchPoll(entity.id)) {
            throw OAuth2DeviceAuthorizationError.slowDown();
        }

        if (!entity.decision) {
            throw OAuth2DeviceAuthorizationError.pending();
        }

        if (entity.decision.status === OAuth2DeviceCodeStatus.DENIED) {
            await this.repository.popOneById(entity.id);
            throw OAuth2AccessDeniedError.forClient();
        }

        const popped = await this.repository.popOneById(entity.id);
        if (!popped || !popped.decision || popped.decision.status !== OAuth2DeviceCodeStatus.APPROVED) {
            throw OAuth2GrantError.invalid();
        }

        return { ...popped, decision: popped.decision };
    }
}
