/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Column,
    CreateDateColumn,
    Entity, Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Permission, User, UserPermission } from '@typescript-auth/domains';
import { UserEntity } from '../user';
import { PermissionEntity } from '../permission';

@Entity({ name: 'auth_user_permissions' })
@Index(['permission_id', 'user_id'], { unique: true })
export class UserPermissionEntity implements UserPermission {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'int', default: 999 })
        power: number;

    @Column({ type: 'text', nullable: true, default: null })
        condition: string | null;

    @Column({ type: 'text', nullable: true, default: null })
        fields: string[] | null;

    @Column({ type: 'boolean', default: false })
        negation: boolean;

    @Column({ type: 'varchar', length: 16, nullable: true })
        target: string | null;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;

    // ------------------------------------------------------------------

    @Column()
        user_id: User['id'];

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
        user: User;

    @Column({ type: 'varchar' })
        permission_id: Permission['id'];

    @ManyToOne(() => PermissionEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'permission_id' })
        permission: Permission;
}
