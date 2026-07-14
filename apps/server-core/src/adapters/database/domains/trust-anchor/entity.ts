/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm, TrustAnchor } from '@authup/core-kit';
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
import { RealmEntity } from '../realm/index.ts';

@Unique('UQ_auth_trust_anchors_name_realm_id', ['name', 'realm_id'])
@Entity({ name: 'auth_trust_anchors' })
export class TrustAnchorEntity implements TrustAnchor {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'varchar',
        length: 128,
    })
    name: string;

    @Column({ type: 'text' })
    certificate: string;

    @Column({
        type: 'boolean',
        default: true,
    })
    enabled: boolean;

    @CreateDateColumn({ transformer: dateToISOStringTransformer })
    created_at: string;

    @UpdateDateColumn({ transformer: dateToISOStringTransformer })
    updated_at: string;

    @Index()
    @Column()
    realm_id: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
    realm: RealmEntity;
}
