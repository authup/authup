/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyData } from '@authup/access';
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
     * @param idOrName Policy UUID or name. Names are resolved within the
     *   supplied realm (or the resolved fallback realm).
     * @param data The evaluation input. Without a `subject` it is evaluated
     *   exactly as given: the caller owns every key, the identity included,
     *   and the HTTP route applies `applyRequestIdentity` to it first. With
     *   a `subject` its identity is replaced by the subject's.
     * @param actor The caller context, whose evaluator gates a `subject`.
     * @param realm Optional realm id used to disambiguate name lookups.
     * @param subject The raw `{ type, id }` naming the user or client to
     *   check for, which requires PERMISSION_CHECK reaching the subject's
     *   realm; `undefined` or `null` checks the data as given.
     * @throws {ValidationError} When the subject is malformed.
     * @throws {PermissionError} When the actor may not check for the subject.
     * @throws {EntityNotFoundError} When no policy or subject matches.
     * @throws {Error} Whatever the policy engine throws on denial.
     */
    check(
        idOrName: string,
        data: PolicyData,
        actor: ActorContext,
        realm?: string,
        subject?: unknown,
    ): Promise<void>;

    /**
     * Same as `check`, but collapses a failure of the check itself into a
     * `Result<null>` with `success: false` and the originating error. Use
     * this at boundaries that want to embed denial in a response body
     * rather than propagate it. Resolving the `subject` still throws: a
     * refusal to check for it answers the request, not the check.
     */
    safeCheck(
        idOrName: string,
        data: PolicyData,
        actor: ActorContext,
        realm?: string,
        subject?: unknown,
    ): Promise<Result<null>>;
}
