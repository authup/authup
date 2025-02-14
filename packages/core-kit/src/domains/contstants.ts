/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum DomainType {
    CLIENT = 'client',
    CLIENT_PERMISSION = 'clientPermission',
    CLIENT_ROLE = 'clientRole',
    CLIENT_SCOPE = 'clientScope',
    IDENTITY_PROVIDER = 'identityProvider',
    IDENTITY_PROVIDER_ACCOUNT = 'identityProviderAccount',
    IDENTITY_PROVIDER_ATTRIBUTE = 'identityProviderAttribute',
    IDENTITY_PROVIDER_ROLE_MAPPING = 'identityProviderRoleMapping',
    POLICY = 'policy',
    POLICY_ATTRIBUTE = 'policyAttribute',
    PERMISSION = 'permission',
    REALM = 'realm',
    ROBOT = 'robot',
    ROBOT_PERMISSION = 'robotPermission',
    ROBOT_ROLE = 'robotRole',
    ROLE = 'role',
    ROLE_ATTRIBUTE = 'roleAttribute',
    ROLE_PERMISSION = 'rolePermission',
    SCOPE = 'scope', // todo: add
    USER = 'user',
    USER_ATTRIBUTE = 'userAttribute',
    USER_PERMISSION = 'userPermission',
    USER_ROLE = 'userRole',
}

// todo: rename to Event{Domain,Resource,Default}Event
export enum DomainEventName {
    CREATED = 'created',
    DELETED = 'deleted',
    UPDATED = 'updated',
}
