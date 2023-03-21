/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client,
    ClientScope,
    IdentityProvider,
    IdentityProviderAccount,
    IdentityProviderAttribute,
    IdentityProviderRole,
    Permission,
    Realm,
    Robot,
    RobotPermission,
    RobotRole,
    Role,
    RoleAttribute,
    RolePermission,
    User,
    UserAttribute,
    UserPermission,
    UserRole,
} from '../domains';

export type SocketEventOperations<T extends string> = `${T}Created` | `${T}Updated` | `${T}Deleted`;
export type SocketEventContext<T extends Record<string, any>> = {
    meta: {
        roomName?: string,
        roomId?: string | number
    },
    data: T
};

export type SocketEventName = SocketEventOperations<'client'> |
SocketEventOperations<'clientScope'> |
SocketEventOperations<'identityProvider'> |
SocketEventOperations<'identityProviderAccount'> |
SocketEventOperations<'identityProviderAttribute'> |
SocketEventOperations<'identityProviderRole'> |
SocketEventOperations<'permission'> |
SocketEventOperations<'realm'> |
SocketEventOperations<'robot'> |
SocketEventOperations<'robotPermission'> |
SocketEventOperations<'robotRole'> |
SocketEventOperations<'role'> |
SocketEventOperations<'roleAttribute'> |
SocketEventOperations<'rolePermission'> |
SocketEventOperations<'user'> |
SocketEventOperations<'userAttribute'> |
SocketEventOperations<'userPermission'> |
SocketEventOperations<'userRole'>;

export type SocketServerToClientData<T> = T extends SocketEventOperations<'client'> ?
    Client :
    T extends SocketEventOperations<'clientScope'> ?
        ClientScope :
        T extends SocketEventOperations<'identityProvider'> ?
            IdentityProvider :
            T extends SocketEventOperations<'identityProviderAccount'> ?
                IdentityProviderAccount :
                T extends SocketEventOperations<'identityProviderAttribute'> ?
                    IdentityProviderAttribute :
                    T extends SocketEventOperations<'identityProviderRole'> ?
                        IdentityProviderRole :
                        T extends SocketEventOperations<'permission'> ?
                            Permission :
                            T extends SocketEventOperations<'realm'> ?
                                Realm :
                                T extends SocketEventOperations<'robot'> ?
                                    Robot :
                                    T extends SocketEventOperations<'robotPermission'> ?
                                        RobotPermission :
                                        T extends SocketEventOperations<'robotRole'> ?
                                            RobotRole :
                                            T extends SocketEventOperations<'role'> ?
                                                Role :
                                                T extends SocketEventOperations<'roleAttribute'> ?
                                                    RoleAttribute :
                                                    T extends SocketEventOperations<'rolePermission'> ?
                                                        RolePermission :
                                                        T extends SocketEventOperations<'user'> ?
                                                            User :
                                                            T extends SocketEventOperations<'userAttribute'> ?
                                                                UserAttribute :
                                                                T extends SocketEventOperations<'userPermission'> ?
                                                                    UserPermission :
                                                                    T extends SocketEventOperations<'userRole'> ?
                                                                        UserRole :
                                                                        never;
