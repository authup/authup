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

@Unique('UQ_auth_consents_subject_scope', ['clientId', 'sub', 'subKind', 'scope'])
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
        name: 'sub_kind', 
        type: 'varchar', 
        length: 64, 
    })
    subKind: string;

    @Column({
        type: 'varchar',
        length: CONSENT_SCOPE_MAX_LENGTH,
    })
    scope: string;

    // ------------------------------------------------------------------

    @Column({
        name: 'expires_at', 
        type: 'varchar', 
        length: 28, 
        nullable: true, 
        default: null, 
    })
    expiresAt: string | null;

    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;

    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    // ------------------------------------------------------------------

    @Index()
    @Column({ name: 'client_id', type: 'uuid' })
    clientId: Client['id'];

    @ManyToOne(() => ClientEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
    client: ClientEntity;

    @Index()
    @Column({ name: 'realm_id', type: 'uuid' })
    realmId: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
    realm: RealmEntity;

    @Index()
    @Column({
        name: 'user_id', 
        type: 'uuid', 
        nullable: true, 
        default: null, 
    })
    userId: User['id'] | null;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'user_id' })
    user: UserEntity | null;
}
