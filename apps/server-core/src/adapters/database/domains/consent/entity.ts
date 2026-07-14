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
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import { dateToISOStringTransformer } from '../../helpers/index.ts';
import type {
    Client,
    Consent,
    Realm,
    User,
} from '@authup/core-kit';
import { ClientEntity } from '../client/index.ts';
import { RealmEntity } from '../realm/index.ts';
import { UserEntity } from '../user/index.ts';
import { CONSENT_SCOPE_MAX_LENGTH } from '../../../../core/entities/consent/types.ts';

@Unique('UQ_auth_consents_subject_scope', ['client_id', 'sub', 'sub_kind', 'scope'])
@Entity({ name: 'auth_consents' })
export class ConsentEntity implements Consent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({
        type: 'varchar',
        length: 64,
    })
    sub: string;

    @Column({
        type: 'varchar',
        length: 64,
    })
    sub_kind: string;

    @Column({
        type: 'varchar',
        length: CONSENT_SCOPE_MAX_LENGTH,
    })
    scope: string;

    // ------------------------------------------------------------------

    @Column({
        type: 'varchar',
        length: 28,
        nullable: true,
        default: null,
    })
    expires_at: string | null;

    @UpdateDateColumn({ transformer: dateToISOStringTransformer })
    updated_at: string;

    @CreateDateColumn({ transformer: dateToISOStringTransformer })
    created_at: string;

    // ------------------------------------------------------------------

    @Index()
    @Column({ type: 'uuid' })
    client_id: Client['id'];

    @ManyToOne(() => ClientEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
    client: ClientEntity;

    @Index()
    @Column({ type: 'uuid' })
    realm_id: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
    realm: RealmEntity;

    @Index()
    @Column({
        type: 'uuid', 
        nullable: true, 
        default: null, 
    })
    user_id: User['id'] | null;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'user_id' })
    user: UserEntity | null;
}
