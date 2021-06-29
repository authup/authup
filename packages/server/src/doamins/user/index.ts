import {
    OneToMany,
    PrimaryGeneratedColumn
} from "typeorm";
import {UserRole} from "./role";
import {UserPermission} from "./permission";

export * from './repository';

export const USER_ENTITY_NAME = 'auth_user';

export abstract class AbstractUser {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @OneToMany(() => UserRole, userRole => userRole.user)
    user_roles: UserRole[];

    @OneToMany(() => UserPermission, userPermission => userPermission.user)
    user_permissions: UserPermission[];
}
