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
import {User, USER_ENTITY_NAME} from "../index";

@Entity()
@Index(['user_id', 'role_id'], {unique: true})
export class UserPermission extends PermissionRelation {
    @PrimaryGeneratedColumn({unsigned: true, type: "int"})
    id: number;

    @Column({type: "uuid"})
    user_id: string;

    @Column({type: "varchar", length: 100})
    permission_id: string;

    @ManyToOne(USER_ENTITY_NAME, 'user_permissions', { onDelete: 'CASCADE' })
    @JoinColumn({name: 'role_id'})
    user: User;

    @ManyToOne(() => Permission, permission => permission.role_permissions, { onDelete: 'CASCADE' })
    @JoinColumn({name: 'permission_id'})
    permission: Permission;
}
