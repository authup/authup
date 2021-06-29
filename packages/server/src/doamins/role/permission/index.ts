import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from "typeorm";
import {Permission} from "../../permission";
import {PermissionRelation} from "../../permission/relation";
import {AbstractRole, ROLE_ENTITY_NAME} from "../index";

@Entity()
@Index(['permission_id', 'role_id'], {unique: true})
export class RolePermission extends PermissionRelation {
    @PrimaryGeneratedColumn({unsigned: true})
    id: number;

    @Column({type: "varchar", length: 100})
    permission_id: string;

    @Column({type: "uuid"})
    role_id: string;

    @ManyToOne(ROLE_ENTITY_NAME, 'role_permissions', { onDelete: 'CASCADE' })
    @JoinColumn({name: 'role_id'})
    role: AbstractRole;

    @ManyToOne(() => Permission, permission => permission.role_permissions, { onDelete: 'CASCADE' })
    @JoinColumn({name: 'permission_id'})
    permission: Permission;
}
