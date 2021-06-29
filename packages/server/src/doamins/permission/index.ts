import {
    Column, CreateDateColumn,
    Entity, OneToMany, PrimaryColumn, UpdateDateColumn
} from "typeorm";
import {RolePermission} from "../role/permission";

@Entity()
export class Permission {
    @PrimaryColumn({type: "varchar", length: 100})
    id: string;

    @Column({type: 'varchar', length: 100, nullable: true, default: null})
    name: string | null;

    @CreateDateColumn()
    created_at: string;

    @UpdateDateColumn()
    updated_at: string;

    @OneToMany(() => RolePermission, rolePermission => rolePermission.permission)
    role_permissions: RolePermission[];

    @OneToMany(() => RolePermission, 'user')
    userPermissions: [];
}

