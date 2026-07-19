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
    @Column({ name: 'session_id', type: 'uuid' })
    sessionId: Session['id'];

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
        name: 'parent_id', 
        type: 'uuid', 
        nullable: true, 
        default: null, 
    })
    parentId: string | null;

    @Column({
        name: 'refresh_token_id', 
        type: 'uuid', 
        nullable: true, 
        default: null, 
    })
    refreshTokenId: string | null;

    @Column({
        name: 'ip_address', 
        type: 'varchar', 
        length: 45, 
    })
    ipAddress: string;

    @Column({
        name: 'user_agent', 
        type: 'varchar', 
        length: 512, 
    })
    userAgent: string;

    @Column({
        name: 'consumed_at', 
        type: 'varchar', 
        length: 28, 
        nullable: true, 
        default: null, 
    })
    consumedAt: string | null;

    @Column({
        name: 'revoked_at', 
        type: 'varchar', 
        length: 28, 
        nullable: true, 
        default: null, 
    })
    revokedAt: string | null;

    @Index()
    @Column({
        name: 'expires_at', 
        type: 'varchar', 
        length: 28, 
    })
    expiresAt: string;

    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;
}
