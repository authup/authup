/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Column,
    CreateDateColumn,
    Entity, Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { IdentityProvider, Realm } from '@authelion/common';
import { IdentityProviderFlow, IdentityProviderType } from '@authelion/common/src/domains/identity-provider/constants';
import { RealmEntity } from '../realm';

@Entity({ name: 'auth_identity_providers' })
@Index(['sub', 'realm_id'], { unique: true })
export class IdentityProviderEntity implements IdentityProvider {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'varchar', length: 36 })
        sub: string;

    @Column({ type: 'varchar', length: 128 })
        name: string;

    @Column({ type: 'varchar', length: 64 })
        type: `${IdentityProviderType}`;

    @Column({ type: 'varchar', length: 64 })
        flow : `${IdentityProviderFlow}`;

    @Column({ type: 'boolean', default: true })
        enabled: boolean;

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;

    @Column()
        realm_id: string;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
        realm: Realm;
}
