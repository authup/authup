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
import { Client } from '../client';

@Entity({ name: 'auth_client_roles' })
@Index(['role_id', 'client_id'], { unique: true })
export class ClientRole {
    @PrimaryGeneratedColumn({ unsigned: true })
        id: number;

    @Column()
        client_id: string;

    @Column({ type: 'int', unsigned: true })
        role_id: number;

    @CreateDateColumn()
        created_at: string;

    @UpdateDateColumn()
        updated_at: string;

    @ManyToOne(() => Role, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'role_id' })
        role: Role;

    @ManyToOne(() => Client, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
        client: Client;
}
