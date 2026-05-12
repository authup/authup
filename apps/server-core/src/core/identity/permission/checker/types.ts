/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPermissionProvider } from '@authup/access';
import type { ActorContext } from '@authup/server-kit';
import type {
    IPermissionRepository,
    IRealmRepository,
} from '../../../entities/index.ts';
import type { IIdentityPermissionProvider } from '../types.ts';

export type PermissionCheckResult = {
    status: 'success' | 'error',
    data?: Record<string, any>
};

export type PermissionCheckerServiceContext = {
    repository: IPermissionRepository;
    realmRepository: IRealmRepository;
    permissionProvider: IPermissionProvider;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export interface IPermissionCheckerService {
    check(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
        realm?: string,
    ): Promise<PermissionCheckResult>;
}
