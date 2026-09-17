/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityPolicyData } from '@authup/access';
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
     * supplied data, for the caller or for the subject `data[identity]`
     * names. Throws on any failure: entity not found, evaluator denial,
     * validator error.
     *
     * Without `data[identity]` the `caller` identity is evaluated, when one
     * is given. With it, the reference must be a user or client `{ type, id }`
     * by UUID, the actor must hold PERMISSION_CHECK reaching that subject's
     * realm, and the reference is replaced by the subject as stored.
     *
     * @param idOrName Policy UUID or name. Names are resolved within the
     *   supplied realm (or the resolved fallback realm).
     * @param data Caller-supplied evaluation input. A copy is used
     *   internally.
     * @param actor The caller context, whose evaluator gates a subject.
     * @param realm Optional realm id used to disambiguate name lookups.
     * @param caller The identity the caller may be evaluated as. The HTTP
     *   route passes the request's own when its scopes include `global`, and
     *   none otherwise.
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
        caller?: IdentityPolicyData,
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
        caller?: IdentityPolicyData,
    ): Promise<Result<null>>;
}
