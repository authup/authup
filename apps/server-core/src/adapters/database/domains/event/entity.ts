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
@Index(['refType', 'refId'])
@Index(['actorName', 'requestIpAddress', 'createdAt'])
@Index(['realmId', 'createdAt'])
@Entity({ name: 'auth_events' })
export class EventEntity implements Event {
    @PrimaryColumn({ type: 'uuid' })
    id: string;

    @Index()
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
        name: 'ref_type', 
        type: 'varchar', 
        length: 64, 
        nullable: true, 
        default: null, 
    })
    refType: string | null;

    @Index()
    @Column({
        name: 'ref_id', 
        type: 'varchar', 
        length: 64, 
        nullable: true, 
        default: null, 
    })
    refId: string | null;

    @Index()
    @Column({
        name: 'client_id',
        type: 'uuid',
        nullable: true,
        default: null,
    })
    clientId: string | null;

    @Index()
    @Column({
        name: 'session_id',
        type: 'uuid',
        nullable: true,
        default: null,
    })
    sessionId: string | null;

    @Index()
    @Column({
        name: 'actor_type', 
        type: 'varchar', 
        length: 16, 
        nullable: true, 
        default: null, 
    })
    actorType: `${IdentityType}` | null;

    @Index()
    @Column({
        name: 'actor_id', 
        type: 'uuid', 
        nullable: true, 
        default: null, 
    })
    actorId: string | null;

    @Column({
        name: 'actor_name',
        type: 'varchar', 
        length: 128, 
        nullable: true, 
        default: null, 
    })
    actorName: string | null;

    @Column({
        name: 'request_path', 
        type: 'varchar', 
        length: 256, 
        nullable: true, 
        default: null, 
    })
    requestPath: string | null;

    @Column({
        name: 'request_method', 
        type: 'varchar', 
        length: 10, 
        nullable: true, 
        default: null, 
    })
    requestMethod: string | null;

    @Index()
    @Column({
        name: 'request_ip_address', 
        type: 'varchar', 
        length: 45, 
        nullable: true, 
        default: null, 
    })
    requestIpAddress: string | null;

    @Column({
        name: 'request_user_agent', 
        type: 'varchar', 
        length: 512, 
        nullable: true, 
        default: null, 
    })
    requestUserAgent: string | null;

    @Index()
    @Column({
        name: 'realm_id', 
        type: 'uuid', 
        nullable: true, 
        default: null, 
    })
    realmId: Realm['id'] | null;

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
        name: 'expires_at', 
        type: 'varchar', 
        length: 28, 
        nullable: true, 
        default: null, 
    })
    expiresAt: string | null;

    @Index()
    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;
}
