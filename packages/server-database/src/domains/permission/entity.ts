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
    PrimaryColumn, PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Permission } from '@authup/common';

@Entity({ name: 'auth_permissions' })
export class PermissionEntity implements Permission {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'varchar', length: 128, unique: true })
        name: string;

    @Column({ type: 'boolean', default: false })
        built_in: boolean;

    @Column({ type: 'text', nullable: true })
        description: string | null;

    @Column({ type: 'varchar', length: 16, nullable: true })
        target: string | null;

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;
}
