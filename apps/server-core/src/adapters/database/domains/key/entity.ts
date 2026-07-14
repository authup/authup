/*
 * Copyright (c) 2022.
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
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import { dateToISOStringTransformer } from '../../helpers/index.ts';
import type { JWKType, JWKUse } from '@authup/specs';
import type {
    Key,
    KeyStatus,
    Realm,
} from '@authup/core-kit';
import { RealmEntity } from '../realm/index.ts';

@Unique('UQ_auth_keys_name_realm_id', ['name', 'realm_id'])
@Index([
    'priority',
    'realm_id',
    'type',
])
@Entity({ name: 'auth_keys' })
export class KeyEntity implements Key {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'varchar',
        length: 128,
    })
    name: string;

    @Index()
    @Column({
        type: 'varchar',
        length: 64,
        default: null,
    })
    type: `${JWKType}`;

    @Column({
        type: 'varchar',
        length: 64,
        default: 'sig',
    })
    use: `${JWKUse}`;

    @Column({
        type: 'int',
        unsigned: true,
        default: 0,
    })
    priority: number;

    @Column({
        type: 'varchar',
        length: 64,
        default: 'active',
    })
    status: `${KeyStatus}`;

    @Column({
        type: 'text',
        nullable: true,
        default: null,
    })
    certificate: string | null;

    @Column({
        type: 'varchar',
        length: 64,
        default: null,
    })
    signature_algorithm: Key['signature_algorithm'];

    @Column({
        type: 'varchar',
        length: 4096,
        default: null,
        select: false,
    })
    decryption_key: string | null;

    @Column({
        type: 'varchar',
        length: 4096,
        default: null,
    })
    encryption_key: string | null;

    // ------------------------------------------------------------------

    @CreateDateColumn({ transformer: dateToISOStringTransformer })
    created_at: string;

    @UpdateDateColumn({ transformer: dateToISOStringTransformer })
    updated_at: string;

    // ------------------------------------------------------------------

    @Index()
    @Column({
        nullable: true,
        default: null, 
    })
    realm_id: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
    realm: RealmEntity;
}
