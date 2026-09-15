/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationCatalog } from '@authup/access';
import {
    DContext,
    DController,
    DGet,
    DTags,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import type { AuthorizationCatalogBuilderContext } from '../../../../../core/index.ts';
import { buildAuthorizationCatalog } from '../../../../../core/index.ts';

/**
 * The identity-free permission catalog: every definition with its policy trees
 * plus every tree a grant can name, for a console or a resource server to
 * evaluate outside this process together with the grants an introspection
 * reports.
 *
 * **Anonymous, and that is structural rather than a convenience.** A consumer
 * of this document is typically a PUBLIC client (`authMethod: none`): it holds
 * no secret, so it can obtain no `client_credentials` token and has no
 * credential of its own to be gated on. The only credential ever in its reach
 * is an end user's, and gating on that would make the document depend on who
 * asks, which is exactly what it must not do: the point is ONE document,
 * fetched once and reused to evaluate as many identities' introspections as the
 * consumer sees. Requiring any identity at all (the former `ForceLoggedIn`) has
 * the same defect, since such a client has none at boot either. So the choice
 * is binary, anonymous or per-user, and it is anonymous. Do not re-add a gate
 * here.
 *
 * What that publishes is the authorization RULES: permission namespaces, which
 * is a closed enum published in `@authup/access` and in the OpenAPI document
 * already, and the policy CONFIGURATION, which is new and is the deliberate
 * trade. Knowing a rule does not help satisfy it (an attributes predicate reads
 * the SUBJECT's attributes, which a reader cannot set), enforcement has never
 * rested on the rules being secret, and the alternative made every integrator
 * hold `PERMISSION_READ` just to read them, which is the broader grant. It
 * joins the anonymous surfaces authup already serves: `GET /`, `GET /realms`,
 * `GET /identity-providers`, the per-realm discovery documents and
 * `/docs/openapi.json`.
 *
 * The catalog stays an upper bound on what may be ASKED, never an entitlement
 * (the `GET /schemas` posture): every decision it feeds runs over the grants of
 * the identity being evaluated, and a consumer only ever sees the grants of
 * identities that hand it a token. It cannot enumerate who holds what.
 *
 * `public, no-cache` because the body is a pure function of the permission and
 * policy rows and depends on no caller: an intermediary may store it and
 * revalidate, which routup's content ETag answers. It is deliberately NOT
 * memoized in process on a TTL. The document is cheap to make wrong that way:
 * a consumer meeting a grant whose definition the catalog lacks refetches ONCE
 * and commits a deny-all evaluator if that answer is stale too, so a TTL memo
 * would turn a routine `POST /permissions` into denied sessions for the length
 * of the window. Bound the cost with the rate-limit middleware; a memo needs
 * invalidation off the permission and policy subscribers, not a clock.
 */
@DTags('auth')
@DController('/authorization')
export class AuthorizationController {
    protected ctx: AuthorizationCatalogBuilderContext;

    constructor(ctx: AuthorizationCatalogBuilderContext) {
        this.ctx = ctx;
    }

    @DGet('')
    async get(
        @DContext() event: IAppEvent,
    ): Promise<AuthorizationCatalog> {
        event.response.headers.set('cache-control', 'public, no-cache');

        return buildAuthorizationCatalog(this.ctx);
    }
}
