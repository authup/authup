/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    CreateDateColumn,
    Entity,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Permission } from '@typescript-auth/domains';

@Entity({ name: 'auth_permissions' })
export class PermissionEntity implements Permission {
    @PrimaryColumn({ type: 'varchar', length: 128, generated: false })
        id: string;

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;
}
