import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {Role} from "../../role";
import {User, USER_ENTITY_NAME} from "../index";

@Entity()
@Index(['role_id', 'user_id'], {unique: true})
export class UserRole {
    @PrimaryGeneratedColumn({unsigned: true, type: "int"})
    id: number;

    @Column({type: "uuid"})
    user_id: string;

    @Column({type: "uuid"})
    role_id: string;

    @CreateDateColumn()
    created_at: string;

    @UpdateDateColumn()
    updated_at: string;

    @ManyToOne('auth_role', 'user_roles', { onDelete: 'CASCADE' })
    @JoinColumn({name: 'role_id'})
    role: Role;

    @ManyToOne(USER_ENTITY_NAME, 'user_roles', { onDelete: 'CASCADE' })
    @JoinColumn({name: 'user_id'})
    user: User;
}
