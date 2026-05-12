/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPermissionProvider } from '@authup/access';
import type { Result } from '@authup/kit';
import type { ActorContext } from '@authup/server-kit';
import type {
    IPermissionRepository,
    IRealmRepository,
} from '../../../entities/index.ts';
import type { IIdentityPermissionProvider } from '../types.ts';

export type PermissionCheckerServiceContext = {
    repository: IPermissionRepository;
    realmRepository: IRealmRepository;
    permissionProvider: IPermissionProvider;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export interface IPermissionCheckerService {
    /**
     * Resolve a permission by id (UUID) or name and evaluate it against
     * the supplied data and actor. Throws on any failure — entity not
     * found, evaluator denial, validator error.
     *
     * If `data[identity]` is omitted, the actor's identity (flattened to
     * `IdentityPolicyData`) is injected. If `data[attributes]` is present,
     * the evaluator runs a full `evaluate`; otherwise it runs a
     * `preEvaluate` (data-less gate check).
     *
     * @param idOrName Permission UUID or name. Names are resolved within
     *   the supplied realm (or the resolved fallback realm).
     * @param data Caller-supplied evaluation input. Mutated copy is used
     *   internally.
     * @param actor The caller context. `actor.identity` becomes the
     *   default identity input when `data[identity]` is unset.
     * @param realm Optional realm id used to disambiguate name lookups.
     * @throws {EntityNotFoundError} When no permission matches.
     * @throws {Error} Whatever the evaluator throws on denial.
     */
    check(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
        realm?: string,
    ): Promise<void>;

    /**
     * Same as `check`, but never throws — collapses any failure into a
     * `Result<null>` with `success: false` and the originating error.
     * Use this at boundaries that want to embed denial in a response body
     * rather than propagate it.
     */
    safeCheck(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
        realm?: string,
    ): Promise<Result<null>>;
}
