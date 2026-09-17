/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationCatalog, AuthorizationCheckPermissions } from '@authup/access';
import {
    BuiltInPolicyType,
    PermissionError,
    definePolicyData,
    isPermissionError,
} from '@authup/access';
import { PermissionName } from '@authup/core-kit';
import {
    DBody,
    DContext,
    DController,
    DGet,
    DPost,
    DTags,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import type {
    AuthorizationCatalogBuilderContext,
    AuthorizationCheckBuilderContext,
    AuthorizationCheckPayload,
} from '../../../../../core/index.ts';
import {
    AuthorizationCheckValidator,
    buildAuthorizationCatalog,
    buildAuthorizationCheck,
    toIdentityPolicyData,
} from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { RequestPermissionEvaluator, buildActorContext, useRequestGrants } from '../../../request/index.ts';

export type AuthorizationControllerContext = AuthorizationCatalogBuilderContext &
AuthorizationCheckBuilderContext;

/**
 * The identity-free permission catalog: every definition with its policy
 * trees plus every tree a grant can name, for a console or a resource server
 * to evaluate outside this process together with the grants an introspection
 * reports. It is one document per CREDENTIAL, since what a caller may read is
 * what its own realm reach covers, so a consumer caches it per credential
 * rather than per subject; `private, no-cache` keeps a shared cache out of it.
 *
 * After `ForceLoggedIn` the pre-gate runs, one of `PERMISSION_READ` /
 * `PERMISSION_UPDATE` / `PERMISSION_DELETE` (reach is neutral there, so a
 * `realm_admin` passes), and then every row is checked against the caller's
 * realm reach, the way `GET /permissions` and `GET /policies` check theirs
 * (#3593), so this route is not the way around that gate.
 *
 * It is not row-for-row identical to those reads, deliberately. Reach removes
 * the CONFIGURATION here rather than the row: a definition out of reach still
 * travels, with `policies: null`, and a tree out of reach as a node no
 * consumer can project. So what a foreign realm still discloses is the
 * identifier tuple of a definition (`name`, `realm_id`, `client_id`,
 * `decision_strategy`) and the id of a policy, where those reads disclose
 * neither. That is the price of the key space staying whole: an ABSENT
 * definition has to keep meaning exactly one thing, that the consumer's copy
 * is older than the definition, which is the one signal a refetch answers.
 *
 * The reach test asks about the realm alone, so a `PERMISSION_READ` grant
 * restricted by an ATTRIBUTES junction policy has no row to evaluate against
 * and denies every realm, which lands on the refusal below. Fail-closed, and
 * the same answer that grant's holder gets from a console today.
 *
 * A resource server reads the catalog with its OWN client credential holding
 * `PERMISSION_READ`: the document is identity-free, so the end user's bearer
 * is the wrong credential for it, and one serving several realms needs a
 * credential whose reach covers them. A console whose user lacks the family
 * reads `check` below instead, which is authoritative; the name-only view it
 * replaces is COARSER than either, ignoring realm reach and junction policies,
 * and survives only for a server serving neither route. A resource server
 * fails closed rather than taking either fallback.
 * The catalog is an upper bound on what may be asked, never an
 * entitlement (the same posture as `GET /schemas`); every decision it feeds
 * still runs over the caller's own grants.
 */
@DTags('auth')
@DController('/authorization')
export class AuthorizationController {
    protected ctx: AuthorizationControllerContext;

    protected checkValidator : AuthorizationCheckValidator;

    constructor(ctx: AuthorizationControllerContext) {
        this.ctx = ctx;
        this.checkValidator = new AuthorizationCheckValidator();
    }

    @DGet('', [ForceLoggedInMiddleware])
    async get(
        @DContext() event: IAppEvent,
    ): Promise<AuthorizationCatalog> {
        const names = [
            PermissionName.PERMISSION_READ,
            PermissionName.PERMISSION_UPDATE,
            PermissionName.PERMISSION_DELETE,
        ];

        const actor = buildActorContext(event);
        await actor.permissionEvaluator.preEvaluateOneOf({ name: names });

        event.response.headers.set('cache-control', 'private, no-cache');

        const catalog = await buildAuthorizationCatalog(this.ctx, async (realmId) => {
            try {
                await actor.permissionEvaluator.evaluateOneOf({
                    name: names,
                    data: definePolicyData({ [BuiltInPolicyType.REALM_MATCH]: realmId }),
                });

                return true;
            } catch (e) {
                // a denial is the answer; anything else denies too, but says so,
                // since a cache or database fault is otherwise indistinguishable
                // from a caller whose reach covers nothing
                if (!isPermissionError(e)) {
                    this.ctx.logger?.warn(
                        `Treated realm ${realmId ?? 'global'} as out of reach while building the authorization ` +
                        `catalog: ${e instanceof Error ? e.message : String(e)}.`,
                    );
                }

                return false;
            }
        });

        // A caller that can evaluate NO definition is answered a refusal rather
        // than a document that denies everything, which reads as authoritative
        // and would gate a console's whole UI closed where the batch check
        // below answers it correctly. The rule is deliberately all or nothing:
        // any partial threshold would be a number nobody can justify.
        //
        // It is reached by the reach the API hands out by DEFAULT. A junction
        // is `own` unless the grant says otherwise, `own` does not reach a
        // global row, and every permission is bound to the global
        // `system.default`, so a credential granted the family and nothing else
        // reaches no definition at all. `ownOrNull` is the floor for this
        // route, for a single-realm resource server as much as for a console.
        if (
            catalog.permissions.length > 0 &&
            catalog.permissions.every((permission) => permission.policies === null)
        ) {
            throw new PermissionError({
                message: 'This credential reaches no authorization definition. ' +
                    'Grant its permission with a realm scope of ownOrNull or wider.',
            });
        }

        return catalog;
    }

    /**
     * The caller's OWN verdicts, paired with the realms they hold in: every
     * global permission definition, or the subset the body names, evaluated
     * against the realms the body asks about.
     *
     * Unlike the catalog above it carries NO permission gate, and that
     * asymmetry is the point rather than an oversight. The catalog publishes
     * definitions and policy trees, which is why it is gated; a verdict set
     * publishes neither. What this discloses is strictly less than the caller
     * form of `POST /permissions/:id/check`, ungated too, discloses one name at
     * a time: answers about the caller's own authorization, no definition, no
     * policy configuration, and no realm key the caller did not itself supply.
     *
     * That is what serves the client this route exists for. A public client
     * holds no secret, so it can obtain no `client_credentials` token and has
     * no credential of its own for the catalog's gate to be satisfied by,
     * while serving it by making the catalog anonymous would publish every
     * policy predicate to anyone who can reach the server.
     *
     * The answer is an upper bound on what may be ATTEMPTED rather than an
     * entitlement, the posture the catalog and `GET /schemas` take: it is a
     * pre-gate, so a grant whose junction policy needs a resource row passes
     * here and is still decided per row. The server stays the enforcement
     * point.
     *
     * There is deliberately no counterpart on `POST /policies/:id/check`. The
     * shape rests on the permission universe being enumerable, and policy
     * names are operator-created and unbounded, so a no-subset form there
     * would have no defensible default.
     */
    @DPost('/check', [ForceLoggedInMiddleware])
    async check(
        @DBody() data: AuthorizationCheckPayload,
        @DContext() event: IAppEvent,
    ): Promise<AuthorizationCheckPermissions> {
        const payload = await this.checkValidator.run(data) as AuthorizationCheckPayload;

        const actor = buildActorContext(event);

        event.response.headers.set('cache-control', 'private, no-cache');

        return buildAuthorizationCheck(this.ctx, {
            names: payload.names,
            realms: payload.realms,
            identity: toIdentityPolicyData(actor.identity),
            decorate: (evaluator) => new RequestPermissionEvaluator(event, evaluator),
            grants: (identity) => useRequestGrants(event, identity),
        });
    }
}
