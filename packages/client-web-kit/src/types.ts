/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IClient } from '@authup/core-http-kit';
import type { Pinia } from 'pinia';
import type {
    AAttributeNamesPolicyForm,
    AClient,
    AClientForm,
    AClientPermissionAssignment,
    AClientPermissionAssignments,
    AClientRoleAssignment,
    AClientRoleAssignments,
    AClientScope,
    AClientScopeAssignment,
    AClientScopeAssignments,
    AClientScopes,
    AClients,
    ACompositePolicyForm,
    ADatePolicyForm,
    AIdentityPolicyForm,
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
    APermissionClientAssignments,
    APermissionRoleAssignments,
    APermissionUserAssignments,
    APermissions,
    APolicies,
    APolicy,
    APolicyForm,
    APolicyTypePicker,
    ARealm,
    ARealmForm,
    ARealmMatchPolicyForm,
    ARealms,
    ARole,
    ARoleClientAssignments,
    ARoleForm,
    ARolePermissionAssignment,
    ARolePermissionAssignments,
    ARoleUserAssignments,
    ARoles,
    AScope,
    AScopeClientAssignments,
    AScopeForm,
    AScopes,
    ATimePolicyForm,
    AUser,
    AUserForm,
    AUserPasswordForm,
    AUserPermissionAssignment,
    AUserPermissionAssignments,
    AUserRoleAssignment,
    AUserRoleAssignments,
    AUsers,
} from './components';

export type CookieOptions = {
    path?: string;
    expires?: Date;
    maxAge?: number;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: boolean | 'none' | 'lax' | 'strict';
    partitioned?: boolean;
};
export type CookieSetFn = (
    key: string,
    value: any,
    options: CookieOptions,
) => void;

export type CookieUnsetFn = (
    key: string,
    options: CookieOptions,
) => void;

export type CookieGetFn = (
    key: string,
) => any;

export type Options = {
    baseURL: string,
    /**
     * Pre-built HTTP client used instead of constructing one from baseURL.
     * Covers the store, the authentication hook and the provided client.
     */
    httpClient?: IClient,

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

        AClientPermissionAssignment: typeof AClientPermissionAssignment;
        AClientPermissionAssignments: typeof AClientPermissionAssignments;

        AClientRoleAssignment: typeof AClientRoleAssignment;
        AClientRoleAssignments: typeof AClientRoleAssignments;

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

        APermissionClientAssignments: typeof APermissionClientAssignments;
        APermissionRoleAssignments: typeof APermissionRoleAssignments;
        APermissionUserAssignments: typeof APermissionUserAssignments;

        APolicy: typeof APolicy;
        APolicies: typeof APolicies;
        APolicyTypePicker: typeof APolicyTypePicker;
        APolicyForm: typeof APolicyForm;
        AAttributeNamesPolicyForm: typeof AAttributeNamesPolicyForm;
        ACompositePolicyForm: typeof ACompositePolicyForm;
        ADatePolicyForm: typeof ADatePolicyForm;
        AIdentityPolicyForm: typeof AIdentityPolicyForm;
        ARealmMatchPolicyForm: typeof ARealmMatchPolicyForm;
        ATimePolicyForm: typeof ATimePolicyForm;

        ARealm: typeof ARealm;
        ARealms: typeof ARealms;
        ARealmForm: typeof ARealmForm;

        ARole: typeof ARole;
        ARoles: typeof ARoles;
        ARoleForm: typeof ARoleForm;

        ARolePermissionAssignment: typeof ARolePermissionAssignment;
        ARolePermissionAssignments: typeof ARolePermissionAssignments;

        ARoleClientAssignments: typeof ARoleClientAssignments;
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
