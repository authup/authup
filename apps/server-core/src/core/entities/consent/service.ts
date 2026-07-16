/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import { EntityNotFoundError } from '@authup/errors';
import { PermissionName } from '@authup/core-kit';
import type { Consent } from '@authup/core-kit';
import { unwrapOAuth2Scope } from '@authup/specs';
import { AbstractEntityService } from '@authup/server-kit';
import type { ActorContext, EntityRepositoryFindManyResult } from '@authup/server-kit';
import {
    CONSENT_SCOPE_MAX_LENGTH,
} from './types.ts';
import type {
    ConsentCoveringInput,
    ConsentRecordInput,
    ConsentServiceReadOptions,
    IConsentRepository,
    IConsentService,
} from './types.ts';

export type ConsentServiceContext = {
    repository: IConsentRepository,
};

export class ConsentService extends AbstractEntityService implements IConsentService {
    protected repository: IConsentRepository;

    constructor(ctx: ConsentServiceContext) {
        super();
        this.repository = ctx.repository;
    }

    protected isOwnedBy(consent: Consent, actor: ActorContext): boolean {
        return !!actor.identity &&
            consent.sub === actor.identity.data.id &&
            consent.sub_kind === actor.identity.type;
    }

    protected normalizeScopeTokens(scope: string | string[] | null): string[] {
        const tokens = unwrapOAuth2Scope(scope ?? [])
            // Drop empty tokens and any token that does not fit the scope
            // column (varchar 128). An over-long token — only reachable via a
            // non-standard scope riding the `global` verifier bypass — is
            // simply not persisted (never remembered), rather than aborting
            // the whole write and losing the sibling tokens ordered after it.
            .filter((token) => token.length > 0 && token.length <= CONSENT_SCOPE_MAX_LENGTH);

        return Array.from(new Set(tokens));
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
        options: ConsentServiceReadOptions = {},
    ): Promise<EntityRepositoryFindManyResult<Consent>> {
        let canReadAll = true;
        try {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CONSENT_READ });
        } catch (e) {
            if (!actor.identity) {
                throw e;
            }
            canReadAll = false;
        }

        if (!canReadAll) {
            // self-service: only the actor's own consents
            return this.repository.findMany(query, {
                owner: {
                    sub: actor.identity!.data.id,
                    subKind: actor.identity!.type,
                },
                ...(options.realmId ? { realmId: options.realmId } : {}),
            });
        }

        const { data: entities, meta } = await this.repository.findMany(query, { ...(options.realmId ? { realmId: options.realmId } : {}) });

        const data: Consent[] = [];
        let { total } = meta;

        for (const entity of entities) {
            if (this.isOwnedBy(entity, actor)) {
                data.push(entity);
                continue;
            }

            try {
                await actor.permissionEvaluator.evaluate({
                    name: PermissionName.CONSENT_READ,
                    data: definePolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: entity,
                        ...this.resourceRealmMatch(entity),
                    }),
                });
                data.push(entity);
            } catch {
                total -= 1;
            }
        }

        return {
            data,
            meta: {
                ...meta,
                total,
            },
        };
    }

    async getOne(id: string, actor: ActorContext, options: ConsentServiceReadOptions = {}): Promise<Consent> {
        const entity = await this.repository.findOneById(id);
        if (!entity || (options.realmId && entity.realm_id !== options.realmId)) {
            // A realm mismatch on the nested mount fails as not-found (no
            // cross-realm existence oracle).
            throw new EntityNotFoundError();
        }

        if (!this.isOwnedBy(entity, actor)) {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CONSENT_READ });
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.CONSENT_READ,
                data: definePolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                    ...this.resourceRealmMatch(entity),
                }),
            });
        }

        return entity;
    }

    async delete(id: string, actor: ActorContext, options: ConsentServiceReadOptions = {}): Promise<Consent> {
        const entity = await this.repository.findOneById(id);
        if (!entity || (options.realmId && entity.realm_id !== options.realmId)) {
            throw new EntityNotFoundError();
        }

        if (!this.isOwnedBy(entity, actor)) {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CONSENT_DELETE });
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.CONSENT_DELETE,
                data: definePolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                    ...this.resourceRealmMatch(entity),
                }),
            });
        }

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }

    async record(input: ConsentRecordInput): Promise<void> {
        const tokens = this.normalizeScopeTokens(input.scope);
        if (tokens.length === 0) {
            return;
        }

        await this.repository.insertMissing({
            clientId: input.clientId,
            realmId: input.realmId,
            owner: input.owner,
            scopes: tokens,
        });
    }

    async isCovering(input: ConsentCoveringInput): Promise<boolean> {
        const tokens = this.normalizeScopeTokens(input.scope);
        if (tokens.length === 0) {
            return true;
        }

        const rows = await this.repository.findAllBySubjectClient(input.clientId, input.owner);
        const now = new Date().toISOString();

        return tokens.every((token) => rows.some(
            (row) => row.scope === token &&
                (row.expires_at === null || row.expires_at > now),
        ));
    }
}
