/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityPolicyData } from '@authup/access';
import type { Client } from '@authup/core-kit';
import { EventName, EventRefType, EventScope } from '@authup/core-kit';
import type { OAuth2SubKind, OAuth2TokenGrant } from '@authup/specs';
import { OAuth2GrantError } from '@authup/specs';
import type {
    IAuthFlowMetrics,
    IEventService,
    IOAuth2AccessPolicyEvaluator,
} from '../../../../../../core/index.ts';

export type AccessPolicyBackstopInput = {
    client: Client,
    grantType: `${OAuth2TokenGrant}`,
    /**
     * Built from the blob scalars, so no identity is loaded. `type` is
     * narrowed past the plain string the evaluator takes, because the audit
     * row carries it as the actor kind.
     */
    subject: IdentityPolicyData & { type: `${OAuth2SubKind}` },
    sessionId: string | null,
    request: {
        ipAddress?: string | null,
        userAgent?: string | null,
    },
    evaluator?: IOAuth2AccessPolicyEvaluator,
    eventService?: IEventService,
    metrics?: IAuthFlowMetrics,
};

/**
 * The /token half of the application access policy: a code minted before the
 * policy was attached (or outside authorize()) must not redeem. Attribute-rich
 * policies stay enforced at the issuance legs, which is why the subject is the
 * blob's own scalars. A policy id with no wired evaluator denies (fail
 * closed). Denial is invalid_grant (RFC 6749 section 5.2 has no
 * access_denied), and it leaves the same AUTHORIZE_FAILED row and `denied`
 * count the interactive leg leaves (#3575).
 */
export async function assertAccessPolicyBackstop(input: AccessPolicyBackstopInput) : Promise<void> {
    if (!input.client.accessPolicyId) {
        return;
    }

    const allowed = input.evaluator ?
        await input.evaluator.evaluate(input.client.accessPolicyId, input.subject) :
        false;
    if (allowed) {
        return;
    }

    await input.eventService?.record({
        scope: EventScope.OAUTH2,
        name: EventName.AUTHORIZE_FAILED,
        refType: EventRefType.CLIENT,
        refId: input.client.id,
        clientId: input.client.id,
        sessionId: input.sessionId,
        actorType: input.subject.type,
        actorId: input.subject.id,
        realmId: input.client.realmId ?? null,
        requestIpAddress: input.request.ipAddress ?? null,
        requestUserAgent: input.request.userAgent ?? null,
        data: { reason: 'accessPolicy', grantType: input.grantType },
    });
    input.metrics?.recordAuthorize('denied');

    throw OAuth2GrantError.invalid();
}
