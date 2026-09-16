/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Result } from '@authup/kit';
import type { ActorContext } from '@authup/server-kit';
import type {
    IPermissionRepository,
    IRealmRepository,
} from '../../../entities/index.ts';

export type PermissionCheckerServiceContext = {
    repository: IPermissionRepository;
    realmRepository: IRealmRepository;
};

export interface IPermissionCheckerService {
    /**
     * Resolve a permission by id (UUID) or name and evaluate it against
     * the supplied data on the actor's evaluator. Throws on any failure:
     * entity not found, evaluator denial, validator error.
     *
     * The service places no identity: the actor's evaluator owns that key,
     * and on a request it is the caller's own identity when the scopes
     * include `global` and absent otherwise, whatever `data[identity]`
     * named. If `data[attributes]` is present, the evaluator runs a full
     * `evaluate` and its `realmId` reaches the realm reach factor under
     * `realmMatch`; otherwise it runs a `preEvaluate` (data-less gate
     * check).
     *
     * @param idOrName Permission UUID or name. Names are resolved within
     *   the supplied realm (or the resolved fallback realm).
     * @param data Caller-supplied evaluation input. Mutated copy is used
     *   internally.
     * @param actor The caller context, supplying the evaluator the check
     *   runs on.
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
