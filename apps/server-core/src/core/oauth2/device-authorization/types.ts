/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client,
    Identity,
    Realm,
    SessionAuthMethod,
} from '@authup/core-kit';
import type { DeviceAuthorizationInfo, OAuth2DeviceAuthorizationResponse } from '@authup/core-http-kit';
import type { OAuth2SubKind } from '@authup/specs';

export enum OAuth2DeviceCodeStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    DENIED = 'denied',
}

export type OAuth2DeviceCodeRequest = {
    /**
     * The device_code: randomBytes(32).toString('hex').
     */
    id: string,
    /**
     * Canonical, 8 symbols, no dash.
     */
    user_code: string,
    client_id: string,
    /**
     * client.realmId, the value the realm gate compares.
     */
    realm_id: string,
    realm_name: string,
    /**
     * Frozen at request: requested-and-verified, or every bound scope.
     */
    scope: string,
    /**
     * Epoch seconds.
     */
    expires_at: number,
};

export type OAuth2DeviceCodeApprovedDecision = {
    status: `${OAuth2DeviceCodeStatus.APPROVED}`,
    sub: string,
    sub_kind: `${OAuth2SubKind.USER}`,
    /**
     * The approver's bearer session.
     */
    session_id: string | null,
    /**
     * The gate result: session.createdAt, seconds.
     */
    auth_time: number,
    auth_method: `${SessionAuthMethod}` | null,
};

export type OAuth2DeviceCodeDeniedDecision = {
    status: `${OAuth2DeviceCodeStatus.DENIED}`,
};

export type OAuth2DeviceCodeDecision = OAuth2DeviceCodeApprovedDecision | OAuth2DeviceCodeDeniedDecision;

export type OAuth2DeviceCode = OAuth2DeviceCodeRequest & {
    status: `${OAuth2DeviceCodeStatus}`,
    decision: OAuth2DeviceCodeDecision | null,
};

export type OAuth2DeviceCodeApproved = OAuth2DeviceCode & {
    decision: OAuth2DeviceCodeApprovedDecision,
};

export interface IOAuth2DeviceCodeRepository {
    /**
     * false = user_code index collision (caller regenerates) or already expired; writes index then blob
     */
    save(entity: OAuth2DeviceCodeRequest): Promise<boolean>;

    /**
     * merged view
     */
    findOneById(id: string): Promise<OAuth2DeviceCode | null>;

    /**
     * index -> blob -> merged view
     */
    findOneByUserCode(userCode: string): Promise<OAuth2DeviceCode | null>;

    /**
     * pops the blob and drops the decision and poll keys; null = already gone
     */
    popOneById(id: string): Promise<OAuth2DeviceCode | null>;

    /**
     * the same sweep, no read
     */
    removeById(id: string): Promise<void>;

    /**
     * write-once; false = already decided or expired
     */
    decide(id: string, decision: OAuth2DeviceCodeDecision, expiresAt: number): Promise<boolean>;

    removeUserCode(userCode: string): Promise<void>;

    /**
     * false = polled inside the fixed 5 s window
     */
    touchPoll(id: string): Promise<boolean>;

    /**
     * null = not throttled, else seconds until the window closes
     */
    lookupThrottle(key: string): Promise<number | null>;

    /**
     * counts a MISS; arms the lock when the limit is reached
     */
    countLookupMiss(key: string, limit: number): Promise<void>;
}

export type OAuth2DeviceCodeVerifyOptions = {
    clientId: string,
    realmId: string,
};

export type OAuth2DeviceCodeVerifierContext = {
    repository: IOAuth2DeviceCodeRepository,
};

export interface IOAuth2DeviceCodeVerifier {
    verify(deviceCode: string, options: OAuth2DeviceCodeVerifyOptions): Promise<OAuth2DeviceCodeApproved>;
}

export type OAuth2DeviceAuthorizationIssueOptions = {
    scope?: string,
};

export type OAuth2DeviceAuthorizationApproveOptions = {
    sessionId?: string | null,
};

export interface IOAuth2DeviceAuthorizationService {
    issue(
        client: Client,
        realm: Realm,
        options?: OAuth2DeviceAuthorizationIssueOptions,
    ): Promise<OAuth2DeviceAuthorizationResponse>;

    lookup(userCode: unknown, identity: Identity): Promise<DeviceAuthorizationInfo>;

    approve(
        userCode: unknown,
        identity: Identity,
        options?: OAuth2DeviceAuthorizationApproveOptions,
    ): Promise<void>;

    deny(userCode: unknown, identity: Identity): Promise<void>;
}
