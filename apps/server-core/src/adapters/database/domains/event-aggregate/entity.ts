/*
 * Copyright (c) 2026.
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
} from 'typeorm';
import type {
    EventAggregate,
    EventScope,
    Realm,
} from '@authup/core-kit';
import { dateToISOStringTransformer } from '../../helpers/index.ts';
import { RealmEntity } from '../realm/index.ts';

// Daily rollup of auth_events. A recompute replaces a whole day under a
// database lock, so no unique constraint over the nullable columns is needed.
// No subscriber: not cached, not realtime-broadcast.
@Index(['day', 'realmId'])
@Entity({ name: 'auth_event_aggregates' })
export class EventAggregateEntity implements EventAggregate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'day', type: 'date' })
    day: string;

    @Column({
        name: 'realm_id',
        type: 'uuid',
        nullable: true,
        default: null,
    })
    realmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'realm_id' })
    realm: RealmEntity | null;

    @Column({
        type: 'varchar',
        length: 64,
    })
    scope: `${EventScope}`;

    @Column({
        type: 'varchar',
        length: 64,
    })
    name: string;

    @Column({
        name: 'ref_type',
        type: 'varchar',
        length: 64,
        nullable: true,
        default: null,
    })
    refType: string | null;

    @Column({ name: 'count', type: 'int' })
    count: number;

    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;
}
