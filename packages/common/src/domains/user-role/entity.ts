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
import { Role } from '../role';
import { User } from '../user';

@Entity({ name: 'user_roles' })
@Index(['role_id', 'user_id'], { unique: true })
export class UserRole {
    @PrimaryGeneratedColumn({ unsigned: true })
        id: number;

    @Column({ type: 'int', unsigned: true })
        user_id: number;

    @Column({ type: 'int', unsigned: true })
        role_id: number;

    @CreateDateColumn()
        created_at: string;

    @UpdateDateColumn()
        updated_at: string;

    @ManyToOne(() => Role, (role) => role.user_roles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'role_id' })
        role: Role;

    @ManyToOne(() => User, (user) => user.user_roles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
        user: User;
}
