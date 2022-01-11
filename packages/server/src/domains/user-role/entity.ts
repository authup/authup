/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Role, User, UserRole } from '@typescript-auth/domains';
import { RoleEntity } from '../role';
import { UserEntity } from '../user';

@Entity({ name: 'auth_user_roles' })
@Index(['role_id', 'user_id'], { unique: true })
export class UserRoleEntity implements UserRole {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column()
        user_id: string;

    @Column()
        role_id: string;

    @CreateDateColumn()
        created_at: string;

    @UpdateDateColumn()
        updated_at: string;

    @ManyToOne(() => RoleEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'role_id' })
        role: Role;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
        user: User;
}
