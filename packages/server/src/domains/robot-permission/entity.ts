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
import { Permission, Robot, RobotPermission } from '@typescript-auth/domains';
import { PermissionEntity } from '../permission';
import { RobotEntity } from '../robot';

@Entity({ name: 'auth_robot_permissions' })
@Index(['permission_id', 'robot_id'], { unique: true })
export class RobotPermissionEntity implements RobotPermission {
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
        robot_id: string;

    @ManyToOne(() => RobotEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'robot_id' })
        robot: Robot;

    @Column({ type: 'varchar' })
        permission_id: string;

    @ManyToOne(() => PermissionEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'permission_id' })
        permission: Permission;
}
