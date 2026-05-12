/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ActorContext } from '@authup/server-kit';
import type {
    IPolicyRepository,
    IRealmRepository,
} from '../../../entities/index.ts';
import type { IIdentityPermissionProvider } from '../../permission/types.ts';

export type PolicyCheckResult = {
    status: 'success' | 'error',
    data?: Record<string, any>
};

export type PolicyCheckerServiceContext = {
    repository: IPolicyRepository;
    realmRepository: IRealmRepository;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export interface IPolicyCheckerService {
    /**
     * Resolve a policy by id (UUID) or name and evaluate it against the
     * supplied data and actor.
     *
     * If `data[identity]` is unset (and not explicitly `null`), the
     * actor's identity (flattened to `IdentityPolicyData`) is injected.
     * Passing an explicit `null` opts out of the default — useful for
     * checking a policy as anonymous.
     *
     * @param idOrName Policy UUID or name. Names are resolved within the
     *   supplied realm (or the resolved fallback realm) so the same name
     *   can collide across realms.
     * @param data Caller-supplied evaluation input. Mutated copy is used
     *   internally.
     * @param actor The caller context. `actor.identity` becomes the
     *   default identity input when `data[identity]` is unset.
     * @param realm Optional realm id used to disambiguate name lookups.
     * @returns `{ status: 'success' }` when the policy passes, or
     *   `{ status: 'error', data: <Error> }` when it throws.
     * @throws {EntityNotFoundError} When no policy matches.
     */
    check(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
        realm?: string,
    ): Promise<PolicyCheckResult>;
}
