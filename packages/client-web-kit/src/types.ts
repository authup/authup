/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Pinia } from 'pinia';
import type {
    AClient,
    AClientForm,
    AClientRedirectUris,
    AClientRedirectUrisItem,
    AClientScope,
    AClientScopeAssignment,
    AClientScopeAssignments,
    AClientScopes,
    AClients,
    AIdentityProvider,
    AIdentityProviderForm,
    AIdentityProviderIcon,
    AIdentityProviderLdapForm,
    AIdentityProviderOAuth2Form,
    AIdentityProviderPreset,
    AIdentityProviderProtocol,
    AIdentityProviderRoleAssignment,
    AIdentityProviderRoleAssignments,
    AIdentityProviders,
    APermission,
    APermissionRobotAssignments,
    APermissionRoleAssignments,
    APermissionUserAssignments,
    APermissions,
    ARealm,
    ARealmForm,
    ARealms,
    ARobot,
    ARobotForm,
    ARobotPermissionAssignment,
    ARobotPermissionAssignments,
    ARobotRoleAssignment,
    ARobotRoleAssignments,
    ARobots,
    ARole,
    ARoleForm,
    ARolePermissionAssignment,
    ARolePermissionAssignments,
    ARoleRobotAssignments,
    ARoleUserAssignments,
    ARoles,
    AScope,
    AScopeClientAssignments,
    AScopeForm,
    AScopes,
    AUser,
    AUserForm,
    AUserPasswordForm,
    AUserPermissionAssignment,
    AUserPermissionAssignments,
    AUserRoleAssignment,
    AUserRoleAssignments,
    AUsers,
} from './components';

export type CookieSetFn = (key: string, value?: any) => void;
export type CookieUnsetFn = (key: string) => void;
export type CookieGetFn = (key: string) => any;

export type Options = {
    baseURL: string,

    realtime?: boolean,
    realtimeURL?: string,

    components?: boolean | string[],
    translatorLocale?: string,

    cookieSet?: CookieSetFn,
    cookieUnset?: CookieUnsetFn,
    cookieGet?: CookieGetFn,

    pinia?: Pinia,
    isServer?: boolean
};

declare module '@vue/runtime-core' {
    export interface GlobalComponents {
        AClient: typeof AClient;
        AClients: typeof AClients;
        AClientForm: typeof AClientForm;
        AClientRedirectUris: typeof AClientRedirectUris;
        AClientRedirectUrisItem: typeof AClientRedirectUrisItem;

        AClientScope: typeof AClientScope;
        AClientScopes: typeof AClientScopes;
        AClientScopeAssignment: typeof AClientScopeAssignment;
        AClientScopeAssignments: typeof AClientScopeAssignments;

        AIdentityProvider: typeof AIdentityProvider;
        AIdentityProviders: typeof AIdentityProviders;
        AIdentityProviderForm: typeof AIdentityProviderForm;
        AIdentityProviderIcon: typeof AIdentityProviderIcon;
        AIdentityProviderLdapForm: typeof AIdentityProviderLdapForm;
        AIdentityProviderOAuth2Form: typeof AIdentityProviderOAuth2Form;
        AIdentityProviderPreset: typeof AIdentityProviderPreset;
        AIdentityProviderProtocol: typeof AIdentityProviderProtocol;

        AIdentityProviderRoleAssignment: typeof AIdentityProviderRoleAssignment;
        AIdentityProviderRoleAssignments: typeof AIdentityProviderRoleAssignments;

        APermission: typeof APermission;
        APermissions: typeof APermissions;

        APermissionRobotAssignments: typeof APermissionRobotAssignments;
        APermissionRoleAssignments: typeof APermissionRoleAssignments;
        APermissionUserAssignments: typeof APermissionUserAssignments;

        ARealm: typeof ARealm;
        ARealms: typeof ARealms;
        ARealmForm: typeof ARealmForm;

        ARobot: typeof ARobot;
        ARobots: typeof ARobots;
        ARobotForm: typeof ARobotForm;

        ARobotPermissionAssignment: typeof ARobotPermissionAssignment;
        ARobotPermissionAssignments: typeof ARobotPermissionAssignments;

        ARobotRoleAssignment: typeof ARobotRoleAssignment;
        ARobotRoleAssignments: typeof ARobotRoleAssignments;

        ARole: typeof ARole;
        ARoles: typeof ARoles;
        ARoleForm: typeof ARoleForm;

        ARolePermissionAssignment: typeof ARolePermissionAssignment;
        ARolePermissionAssignments: typeof ARolePermissionAssignments;

        ARoleRobotAssignments: typeof ARoleRobotAssignments;
        ARoleUserAssignments: typeof ARoleUserAssignments;

        AScope: typeof AScope;
        AScopes: typeof AScopes;
        AScopeForm: typeof AScopeForm;

        AScopeClientAssignments: typeof AScopeClientAssignments;

        AUser: typeof AUser;
        AUsers: typeof AUsers;
        AUserForm: typeof AUserForm;
        AUserPasswordForm: typeof AUserPasswordForm;

        AUserPermissionAssignment: typeof AUserPermissionAssignment;
        AUserPermissionAssignments: typeof AUserPermissionAssignments;

        AUserRoleAssignment: typeof AUserRoleAssignment;
        AUserRoleAssignments: typeof AUserRoleAssignments;
    }
}
