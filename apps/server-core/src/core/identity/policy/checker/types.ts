/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyData } from '@authup/access';
import type { Result } from '@authup/kit';
import type {
    IPolicyRepository,
    IRealmRepository,
} from '../../../entities/index.ts';
import type { IIdentityPermissionProvider } from '../../permission/types.ts';

export type PolicyCheckerServiceContext = {
    repository: IPolicyRepository;
    realmRepository: IRealmRepository;
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
     * @param data The evaluation input, evaluated exactly as given: the
     *   caller owns every key, the identity included. The HTTP route
     *   applies `applyRequestIdentity` to it first.
     * @param realm Optional realm id used to disambiguate name lookups.
     * @throws {EntityNotFoundError} When no policy matches.
     * @throws {Error} Whatever the policy engine throws on denial.
     */
    check(
        idOrName: string,
        data: PolicyData,
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
        data: PolicyData,
        realm?: string,
    ): Promise<Result<null>>;
}
