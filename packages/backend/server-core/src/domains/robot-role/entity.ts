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
import { Robot, RobotRole, Role } from '@typescript-auth/domains';
import { RoleEntity } from '../role';
import { RobotEntity } from '../robot';

@Entity({ name: 'auth_robot_roles' })
@Index(['role_id', 'robot_id'], { unique: true })
export class RobotRoleEntity implements RobotRole {
    @PrimaryGeneratedColumn()
        id: string;

    // ------------------------------------------------------------------

    @Column()
        role_id: string;

    @ManyToOne(() => RoleEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'role_id' })
        role: Role;

    @Column()
        robot_id: string;

    @ManyToOne(() => RobotEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
        robot: Robot;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: string;

    @UpdateDateColumn()
        updated_at: string;
}
