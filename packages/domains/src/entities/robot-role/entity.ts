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
import { Role } from '../role';
import { Robot } from '../robot';

@Entity({ name: 'auth_robot_roles' })
@Index(['role_id', 'robot_id'], { unique: true })
export class RobotRole {
    @PrimaryGeneratedColumn()
        id: string;

    @Column()
        robot_id: string;

    @Column()
        role_id: string;

    @CreateDateColumn()
        created_at: string;

    @UpdateDateColumn()
        updated_at: string;

    @ManyToOne(() => Role, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'role_id' })
        role: Role;

    @ManyToOne(() => Robot, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
        robot: Robot;
}
