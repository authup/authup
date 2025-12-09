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
import type {
    Realm, Robot, RobotRole, Role,
} from '@authup/core-kit';
import { RoleEntity } from '../role';
import { RobotEntity } from '../robot/entity';
import { RealmEntity } from '../realm';

@Entity({ name: 'auth_robot_roles' })
@Index(['role_id', 'robot_id'], { unique: true })
export class RobotRoleEntity implements RobotRole {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    // ------------------------------------------------------------------

    @Column()
        role_id: string;

    @ManyToOne(() => RoleEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'role_id' })
        role: Role;

    @Column({ nullable: true })
        role_realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'role_realm_id' })
        role_realm: Realm | null;

    @Column()
        robot_id: string;

    @ManyToOne(() => RobotEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
        robot: Robot;

    @Column({ nullable: true })
        robot_realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'robot_realm_id' })
        robot_realm: Realm | null;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: string;

    @UpdateDateColumn()
        updated_at: string;
}
