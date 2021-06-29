import {
    Column,
    CreateDateColumn,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {RolePermission} from "./permission";
import {UserRole} from "../user/role";

export * from './repository';

export const ROLE_ENTITY_NAME = 'auth_role';

export abstract class Role {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({type: 'varchar', length: 120, nullable: true})
    name: string | null;

    @Column({type: "text", nullable: true})
    description: string | null;

    @CreateDateColumn()
    created_at: string;

    @UpdateDateColumn()
    updated_at: string

    @OneToMany(() => UserRole, (userRole) => userRole.role)
    user_roles: UserRole[]

    @OneToMany(() => RolePermission, rolePermission => rolePermission.role)
    role_permissions: RolePermission[]
}
