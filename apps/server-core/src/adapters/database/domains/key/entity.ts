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

@Unique(['name', 'realmId'])
@Index([
    'priority',
    'realmId',
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
        name: 'signature_algorithm', 
        type: 'varchar', 
        length: 64, 
        default: null, 
    })
    signatureAlgorithm: Key['signatureAlgorithm'];

    @Column({
        name: 'decryption_key', 
        type: 'text', 
        default: null, 
        select: false, 
    })
    decryptionKey: string | null;

    @Column({
        name: 'encryption_key', 
        type: 'text', 
        default: null, 
    })
    encryptionKey: string | null;

    // ------------------------------------------------------------------

    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;

    // ------------------------------------------------------------------

    @Index()
    @Column({
        name: 'realm_id', 
        nullable: true, 
        default: null, 
    })
    realmId: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
    realm: RealmEntity;
}
