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
import { Permission } from '../permission';
import { User } from '../user';

@Entity({ name: 'auth_user_permissions' })
@Index(['permission_id', 'user_id'], { unique: true })
export class UserPermission {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'int', default: 999 })
        power: number;

    @Column({ type: 'text', nullable: true, default: null })
        condition: any | null;

    @Column({ type: 'text', nullable: true, default: null })
        fields: string[] | null;

    @Column({ type: 'boolean', default: false })
        negation: boolean;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;

    // ------------------------------------------------------------------

    @Column()
        user_id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
        user: User;

    @Column({ type: 'varchar' })
        permission_id: string;

    @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'permission_id' })
        permission: Permission;
}
