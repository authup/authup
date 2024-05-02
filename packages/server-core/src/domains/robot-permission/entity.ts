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
    deserialize,
    serialize,
} from '@authup/kit';
import {
    Permission, Robot,
} from '@authup/core-kit';
import type { PermissionCondition, Realm, RobotPermission } from '@authup/core-kit';
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

    @Column({
        type: 'text',
        nullable: true,
        default: null,
        transformer: {
            to(value: any): any {
                return serialize(value);
            },
            from(value: any): any {
                return deserialize(value);
            },
        },
    })
        condition: PermissionCondition | null;

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

    @Column({ nullable: true })
        permission_realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'permission_realm_id' })
        permission_realm: Realm | null;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;
}
