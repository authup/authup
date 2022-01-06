/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';
import { RolePermission } from '../role-permission';

@Entity({ name: 'auth_permissions' })
export class Permission {
    @PrimaryColumn({ type: 'varchar', length: 128, generated: false })
        id: string;

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;

    @OneToMany(() => RolePermission, (rolePermission) => rolePermission.permission)
        role_permissions: RolePermission[];
}
