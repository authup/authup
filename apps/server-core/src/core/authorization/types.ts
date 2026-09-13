/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BasePermission, BasePolicy, PermissionGetOptions } from '@authup/access';
import type { Logger } from '@authup/server-kit';
import type { IIdentityPermissionProvider } from '../identity/permission/types.ts';

export type PermissionDefinition = {
    permission: BasePermission,
    policies: BasePolicy[],
};

export interface IPermissionDefinitionProvider {
    findDefinitions(keys: PermissionGetOptions[]): Promise<PermissionDefinition[]>;
}

export type AuthorizationDocumentBuilderContext = {
    identityPermissionProvider: IIdentityPermissionProvider,
    permissionDefinitionProvider: IPermissionDefinitionProvider,
    logger?: Logger,
};
