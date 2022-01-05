/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BeforeInsert,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { AuthClientType } from './type';
import { createAuthClientSecret } from './utils';
import { MASTER_REALM_ID } from '../realm';

@Entity({ name: 'auth_clients' })
export class Client {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'varchar', length: 100 })
        secret: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
        name: string;

    @Column({ type: 'text', nullable: true })
        description: string;

    @Column({ type: 'enum', enum: AuthClientType })
        type: AuthClientType;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: string;

    @UpdateDateColumn()
        updated_at: string;

    // ------------------------------------------------------------------

    @Column({ type: 'int', nullable: true })
        user_id: number | null;

    @Column({ type: 'varchar', default: MASTER_REALM_ID })
        realm_id: string;

    // ------------------------------------------------------------------

    @Column({ type: 'boolean', default: false })
        synced: boolean;

    // ------------------------------------------------------------------

    @BeforeInsert()
    createSecret() {
        if (typeof this.secret === 'undefined') {
            this.secret = createAuthClientSecret();
        }
    }

    refreshSecret() {
        this.secret = createAuthClientSecret();
    }
}
