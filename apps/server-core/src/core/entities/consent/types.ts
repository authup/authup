/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Consent } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult } from '@authup/server-kit';

export type ConsentOwner = {
    sub: string,
    subKind: string,
};

/**
 * Max length of a single stored scope token — must equal the
 * `auth_consents.scope` column width (varchar 128). A longer token (only
 * reachable via a non-standard scope riding the `global` verifier bypass) is
 * dropped at normalization rather than overflowing the column.
 */
export const CONSENT_SCOPE_MAX_LENGTH = 128;

/**
 * Filter keys a consent list query may target. Shared by the repository's
 * rapiq `filters.allowed` so service and adapter can never drift.
 */
export const CONSENT_FILTER_KEYS = [
    'id',
    'clientId',
    'realmId',
    'sub',
    'subKind',
    'scope',
] as const;

export type ConsentFindManyOptions = {
    /**
     * Force the result to a single subject (self-service). Applied as a
     * mandatory WHERE that a rapiq query filter cannot override.
     */
    owner?: ConsentOwner,
    /**
     * Restrict the result to a single realm (the `/realms/:realmId/consents`
     * nested mount). Mandatory WHERE, not overridable by a rapiq filter.
     */
    realmId?: string,
};

export type ConsentServiceReadOptions = {
    realmId?: string,
};

export type ConsentRecordInput = {
    clientId: string,
    realmId: string,
    owner: ConsentOwner,
    /**
     * Raw scope representation(s) — normalized to lowercase tokens via
     * `unwrapOAuth2Scope` before persistence.
     */
    scope: string | string[] | null,
};

export type ConsentCoveringInput = {
    clientId: string,
    owner: ConsentOwner,
    scope: string | string[] | null,
};

export interface IConsentRepository {
    findMany(query: Record<string, any>, options?: ConsentFindManyOptions): Promise<EntityRepositoryFindManyResult<Consent>>;

    findOneById(id: string): Promise<Consent | null>;

    /**
     * Covering-lookup source — query-cached
     * (`CachePrefix.CONSENT_COVERING`, 60s), invalidated by the
     * `ConsentEntitySubscriber` on insert/update/remove.
     */
    findAllBySubjectClient(clientId: string, owner: ConsentOwner): Promise<Consent[]>;

    /**
     * Union/keep: insert one row per missing scope token, never touching
     * existing rows. Race-safe under the 4-column unique index.
     */
    insertMissing(input: {
        clientId: string, 
        realmId: string, 
        owner: ConsentOwner, 
        scopes: string[] 
    }): Promise<void>;

    remove(entity: Consent): Promise<void>;
}

export interface IConsentService {
    /**
     * List consents. An actor without `CONSENT_READ` is scoped to its own
     * rows (self-service); an actor with `CONSENT_READ` sees every row its
     * realm reach permits.
     */
    getMany(query: Record<string, any>, actor: ActorContext, options?: ConsentServiceReadOptions): Promise<EntityRepositoryFindManyResult<Consent>>;

    /**
     * Read a single consent by id. Own rows need no permission.
     */
    getOne(id: string, actor: ActorContext, options?: ConsentServiceReadOptions): Promise<Consent>;

    /**
     * Revoke (delete) a single consent by id. Own rows need no permission.
     */
    delete(id: string, actor: ActorContext, options?: ConsentServiceReadOptions): Promise<Consent>;

    /**
     * Flow integration (POST /authorize approval) — no permission checks:
     * the subject consents to its own grant. Inputs are server-derived
     * (verifier-stamped client/realm, token-derived subject), never raw
     * client input.
     */
    record(input: ConsentRecordInput): Promise<void>;

    /**
     * Strict covering: every requested token has an unexpired row.
     */
    isCovering(input: ConsentCoveringInput): Promise<boolean>;
}
