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
import type { IIdentityResolver } from '../../resolver/types.ts';
import type { IIdentityPermissionProvider } from '../types.ts';

export type PermissionCheckerServiceContext = {
    repository: IPermissionRepository;
    realmRepository: IRealmRepository;
    identityResolver: IIdentityResolver;
    permissionProvider: IPermissionProvider;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export interface IPermissionCheckerService {
    /**
     * Resolve a permission by id (UUID) or name and evaluate it against
     * the supplied data, for the caller or for a `subject`. Throws on any
     * failure: entity not found, evaluator denial, validator error.
     *
     * Without a `subject` the check runs on the actor's evaluator, which owns
     * the identity key: on a request it is the caller's own identity when the
     * scopes include `global` and absent otherwise, whatever `data[identity]`
     * named. With a `subject` the actor must hold PERMISSION_CHECK reaching
     * the subject's realm, and the check runs on a bare evaluator for the
     * subject as stored. If `data[attributes]` is present, the evaluator runs
     * a full `evaluate` and its `realmId` reaches the realm reach factor
     * under `realmMatch`; otherwise it runs a `preEvaluate` (data-less gate
     * check).
     *
     * @param idOrName Permission UUID or name. Names are resolved within
     *   the supplied realm (or the resolved fallback realm).
     * @param data Caller-supplied evaluation input. Mutated copy is used
     *   internally.
     * @param actor The caller context: its evaluator runs a check for the
     *   caller and gates a check for a `subject`.
     * @param realm Optional realm id used to disambiguate name lookups.
     * @param subject The raw `{ type, id }` naming the user or client to
     *   check for, by UUID; `undefined` or `null` checks for the caller.
     * @throws {ValidationError} When the subject is malformed.
     * @throws {PermissionError} When the actor may not check for the subject.
     * @throws {EntityNotFoundError} When no permission or subject matches.
     * @throws {Error} Whatever the evaluator throws on denial.
     */
    check(
        idOrName: string,
        data: Record<string, any>,
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
        data: Record<string, any>,
        actor: ActorContext,
        realm?: string,
        subject?: unknown,
    ): Promise<Result<null>>;
}
