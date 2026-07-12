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
    PrimaryColumn,
} from 'typeorm';
import type {
    Event,
    EventName,
    EventScope,
    IdentityType,
    Realm,
} from '@authup/core-kit';
import {
    deserialize,
    serialize,
} from '@authup/kit';
import { dateToISOStringTransformer } from '../../helpers/index.ts';

// Append-only audit record. All references (actor, client, realm, ref) are
// plain columns without FKs — a row must survive deletion of everything it
// references. Not cached, not realtime-broadcast: no subscriber.
@Index(['name', 'scope'])
@Index(['ref_type', 'ref_id'])
@Entity({ name: 'auth_events' })
export class EventEntity implements Event {
    @PrimaryColumn({ type: 'uuid' })
    id: string;

    @Column({
        type: 'varchar',
        length: 64,
    })
    scope: `${EventScope}`;

    @Column({
        type: 'varchar',
        length: 64,
    })
    name: `${EventName}`;

    @Column({
        type: 'varchar',
        length: 64,
        nullable: true,
        default: null,
    })
    ref_type: string | null;

    @Column({
        type: 'varchar',
        length: 64,
        nullable: true,
        default: null,
    })
    ref_id: string | null;

    @Index()
    @Column({
        type: 'uuid',
        nullable: true,
        default: null,
    })
    client_id: string | null;

    @Column({
        type: 'varchar',
        length: 16,
        nullable: true,
        default: null,
    })
    actor_type: `${IdentityType}` | null;

    @Index()
    @Column({
        type: 'uuid',
        nullable: true,
        default: null,
    })
    actor_id: string | null;

    @Index()
    @Column({
        type: 'varchar',
        length: 128,
        nullable: true,
        default: null,
    })
    actor_name: string | null;

    @Column({
        type: 'varchar',
        length: 256,
        nullable: true,
        default: null,
    })
    request_path: string | null;

    @Column({
        type: 'varchar',
        length: 10,
        nullable: true,
        default: null,
    })
    request_method: string | null;

    @Index()
    @Column({
        type: 'varchar',
        length: 45,
        nullable: true,
        default: null,
    })
    request_ip_address: string | null;

    @Column({
        type: 'varchar',
        length: 512,
        nullable: true,
        default: null,
    })
    request_user_agent: string | null;

    @Index()
    @Column({
        type: 'uuid',
        nullable: true,
        default: null,
    })
    realm_id: Realm['id'] | null;

    @Column({
        type: 'text',
        nullable: true,
        default: null,
        transformer: {
            to(value: any): any {
                // serialize(null) would persist the string 'null' instead of
                // a SQL NULL — keep absent context a real NULL column.
                return value === null || typeof value === 'undefined' ?
                    null :
                    serialize(value);
            },
            from(value: any): any {
                return deserialize(value);
            },
        },
    })
    data: Record<string, any> | null;

    @Index()
    @Column({ type: 'boolean', default: false })
    expiring: boolean;

    @Index()
    @Column({
        type: 'varchar',
        length: 28,
        nullable: true,
        default: null,
    })
    expires_at: string | null;

    @Index()
    @CreateDateColumn({ transformer: dateToISOStringTransformer })
    created_at: string;
}
