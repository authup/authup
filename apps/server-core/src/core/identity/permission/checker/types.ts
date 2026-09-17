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
     * Resolve a permission by id (UUID) or name and evaluate it against the
     * supplied data, for the caller or for the subject `data[identity]`
     * names. Throws on any failure: entity not found, evaluator denial,
     * validator error.
     *
     * Without `data[identity]` the actor's identity is evaluated, on the
     * actor's evaluator, which on a request keeps it only when the scopes
     * include `global`. With it, the reference must be a user or client `{ type, id }`
     * by UUID, the actor must hold PERMISSION_CHECK reaching that subject's
     * realm, and the check runs on a bare evaluator with the reference
     * replaced by the subject as stored. The resolved permission row is
     * evaluated, not a global permission of the same name. If
     * `data[attributes]` is present, the evaluator runs a full `evaluate` and
     * its `realmId` reaches the realm reach factor under `realmMatch`;
     * otherwise it runs a `preEvaluate` (data-less gate check).
     *
     * @param idOrName Permission UUID or name. Names are resolved within
     *   the supplied realm (or the resolved fallback realm).
     * @param data Caller-supplied evaluation input. A copy is used
     *   internally.
     * @param actor The caller context: its evaluator runs a check for the
     *   caller and gates a check for a subject.
     * @param realm Optional realm id used to disambiguate name lookups.
     * @throws {ValidationError} When `data[identity]` is present but malformed.
     * @throws {PermissionError} When the actor may not check for the subject.
     * @throws {EntityNotFoundError} When no permission or subject matches.
     * @throws {Error} Whatever the evaluator throws on denial.
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
