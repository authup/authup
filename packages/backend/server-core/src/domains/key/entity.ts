/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import {
    Key,
    KeyStatus,
    KeyType,
    Realm,
} from '@authelion/common';
import { RealmEntity } from '../realm';

@Entity({ name: 'auth_keys' })
export class KeyEntity implements Key {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({
        type: 'varchar',
        length: 64,
        default: null,
    })
        type: `${KeyType}`;

    @Column({
        type: 'int',
        unsigned: true,
        default: 0,
    })
        priority: number;

    @Column({
        type: 'varchar',
        length: 64,
        default: null,
    })
        signature_algorithm: Key['signature_algorithm'];

    @Column({
        type: 'varchar',
        length: 64,
        default: null,
    })
        status: `${KeyStatus}`;

    @Column({
        type: 'varchar',
        length: 4096,
        default: null,
        select: false,
    })
        decryption_key?: string | null;

    @Column({
        type: 'varchar',
        length: 4096,
        default: null,
    })
        encryption_key: string | null;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;

    // ------------------------------------------------------------------

    @Column({ nullable: true, default: null })
        realm_id: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
        realm: RealmEntity;
}
