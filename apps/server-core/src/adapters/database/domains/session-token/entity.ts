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
    PrimaryColumn,
} from 'typeorm';
import type { Session, SessionToken, SessionTokenKind } from '@authup/core-kit';
import { dateToISOStringTransformer } from '../../helpers/index.ts';
import { SessionEntity } from '../session/index.ts';

@Entity({ name: 'auth_session_tokens' })
export class SessionTokenEntity implements SessionToken {
    @PrimaryColumn({ type: 'uuid' })
    id: string;

    @Index()
    @Column({ type: 'uuid' })
    session_id: Session['id'];

    @ManyToOne(() => SessionEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'session_id' })
    session: SessionEntity;

    @Index()
    @Column({
        type: 'varchar',
        length: 16,
    })
    kind: SessionTokenKind;

    // Informational lineage columns (no referential FK — the row is inventory
    // metadata; the replay reaction is session-scoped, not chain-walked).
    @Column({
        type: 'uuid',
        nullable: true,
        default: null,
    })
    parent_id: string | null;

    @Column({
        type: 'uuid',
        nullable: true,
        default: null,
    })
    refresh_token_id: string | null;

    @Column({
        type: 'varchar',
        length: 45,
    })
    ip_address: string;

    @Column({
        type: 'varchar',
        length: 512,
    })
    user_agent: string;

    @Column({
        type: 'varchar',
        length: 28,
        nullable: true,
        default: null,
    })
    consumed_at: string | null;

    @Column({
        type: 'varchar',
        length: 28,
        nullable: true,
        default: null,
    })
    revoked_at: string | null;

    @Index()
    @Column({
        type: 'varchar',
        length: 28,
    })
    expires_at: string;

    @CreateDateColumn({ transformer: dateToISOStringTransformer })
    created_at: string;
}
