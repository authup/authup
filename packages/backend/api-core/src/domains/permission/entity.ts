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
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Permission } from '@authelion/common';

@Entity({ name: 'auth_permissions' })
export class PermissionEntity implements Permission {
    @PrimaryColumn({ type: 'varchar', length: 128, generated: false })
        id: string;

    @Column({ type: 'varchar', length: 16, nullable: true })
        target: string | null;

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;
}
