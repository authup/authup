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
import { Permission } from '../permission';
import { Client } from '../client';

@Entity({ name: 'auth_client_permissions' })
@Index(['permission_id', 'client_id'], { unique: true })
export class ClientPermission {
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
        client_id: string;

    @ManyToOne(() => Client, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
        client: Client;

    @Column({ type: 'varchar' })
        permission_id: string;

    @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'permission_id' })
        permission: Permission;
}
