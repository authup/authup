/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientEventContext } from './client';
import type { ClientScopeEventContext } from './client-scope';
import type { DomainEventName, DomainType } from './contstants';
import type { IdentityProviderEventContext } from './identity-provider';
import type { IdentityProviderAccountEventContext } from './identity-provider-account';
import type { IdentityProviderAttributeEventContext } from './identity-provider-attribute';
import type { IdentityProviderRoleEventContext } from './identity-provider-role';
import type { PermissionEventContext } from './permission';
import type { RealmEventContext } from './realm';
import type { RobotEventContext } from './robot';
import type { RobotPermissionEventContext } from './robot-permission';
import type { RobotRoleEventContext } from './robot-role';
import type { RoleEventContext } from './role';
import type { RoleAttributeEventContext } from './role-attribute';
import type { RolePermissionEventContext } from './role-permission';
import type { ScopeEventContext } from './scope';
import type { UserEventContext } from './user';
import type { UserAttributeEventContext } from './user-attribute';
import type { UserPermissionEventContext } from './user-permission';
import type { UserRoleEventContext } from './user-role';

export type DomainEventContext = ClientEventContext |
ClientScopeEventContext |
IdentityProviderEventContext |
IdentityProviderAccountEventContext |
IdentityProviderAttributeEventContext |
IdentityProviderRoleEventContext |
PermissionEventContext |
RealmEventContext |
RobotEventContext |
RobotPermissionEventContext |
RobotRoleEventContext |
RoleEventContext |
RoleAttributeEventContext |
RolePermissionEventContext |
ScopeEventContext |
UserEventContext |
UserAttributeEventContext |
UserPermissionEventContext |
UserRoleEventContext;

export type DomainEventFullName<T extends `${DomainType}` = `${DomainType}`> = `${T}${Capitalize<`${DomainEventName}`>}`;
