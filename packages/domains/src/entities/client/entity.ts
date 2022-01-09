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
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { MASTER_REALM_ID, Realm } from '../realm';
import { User } from '../user';

@Entity({ name: 'auth_clients' })
export class Client {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'varchar', length: 512, select: false })
        secret: string;

    @Column({ type: 'varchar', length: 256, nullable: true })
        name: string;

    @Column({ type: 'text', nullable: true })
        description: string;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: string;

    @UpdateDateColumn()
        updated_at: string;

    // ------------------------------------------------------------------

    @Column({ type: 'int', nullable: true })
        user_id: number | null;

    @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'realm_id' })
        user: User | null;

    @Column({ default: MASTER_REALM_ID })
        realm_id: string;

    @ManyToOne(() => Realm, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
        realm: Realm;
}
