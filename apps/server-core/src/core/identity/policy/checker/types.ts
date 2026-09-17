/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Result } from '@authup/kit';
import type { ActorContext } from '@authup/server-kit';
import type {
    IPolicyRepository,
    IRealmRepository,
} from '../../../entities/index.ts';
import type { IIdentityPermissionProvider } from '../../permission/types.ts';
import type { IIdentityResolver } from '../../resolver/types.ts';

export type PolicyCheckerServiceContext = {
    repository: IPolicyRepository;
    realmRepository: IRealmRepository;
    identityResolver: IIdentityResolver;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export interface IPolicyCheckerService {
    /**
     * Resolve a policy by id (UUID) or name and evaluate it against the
     * supplied data. Throws on any failure: entity not found, evaluator
     * denial, validator error.
     *
     * `data[identity]` decides who is evaluated (see `buildCheckData`):
     * absent, the actor's identity; `null`, no identity; an identity, that
     * identity as given, which needs PERMISSION_CHECK reaching the subject's
     * stored realm when it is not the actor's own.
     *
     * @param idOrName Policy UUID or name. Names are resolved within the
     *   supplied realm (or the resolved fallback realm).
     * @param data Caller-supplied evaluation input. A copy is used
     *   internally.
     * @param actor The caller context: its identity is the default (the HTTP
     *   route passes one only when the request's scopes include `global`),
     *   and its evaluator gates a check for another subject.
     * @param realm Optional realm id used to disambiguate name lookups.
     * @throws {ValidationError} When `data[identity]` is present but malformed.
     * @throws {PermissionError} When the actor may not check for the subject.
     * @throws {EntityNotFoundError} When no policy or subject matches.
     * @throws {Error} Whatever the policy engine throws on denial.
     */
    check(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
        realm?: string,
    ): Promise<void>;

    /**
     * Same as `check`, but collapses a failure of the check itself into a
     * `Result<null>` with `success: false` and the originating error. Use
     * this at boundaries that want to embed denial in a response body
     * rather than propagate it. Resolving the subject still throws: a
     * refusal to check for it answers the request, not the check.
     */
    safeCheck(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
        realm?: string,
    ): Promise<Result<null>>;
}
