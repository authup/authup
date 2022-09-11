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
import {
    Permission, Realm, Robot, RobotPermission,
} from '@authelion/common';
import { PermissionEntity } from '../permission';
import { RobotEntity } from '../robot/entity';
import { RealmEntity } from '../realm';

@Entity({ name: 'auth_robot_permissions' })
@Index(['permission_id', 'robot_id'], { unique: true })
export class RobotPermissionEntity implements RobotPermission {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'int', default: 999 })
        power: number;

    @Column({ type: 'text', nullable: true, default: null })
        condition: string | null;

    @Column({ type: 'text', nullable: true, default: null })
        fields: string | null;

    @Column({ type: 'boolean', default: false })
        negation: boolean;

    @Column({ type: 'varchar', length: 16, nullable: true })
        target: string | null;

    // ------------------------------------------------------------------

    @Column()
        robot_id: string;

    @ManyToOne(() => RobotEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'robot_id' })
        robot: Robot;

    @Column({ nullable: true })
        robot_realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'robot_realm_id' })
        robot_realm: Realm | null;

    @Column({ type: 'varchar' })
        permission_id: string;

    @ManyToOne(() => PermissionEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'permission_id' })
        permission: Permission;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;
}
