/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createNanoID } from '@authup/kit';
import {
    BeforeInsert,
    BeforeUpdate,
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
    Realm,
    Robot,
    User,
} from '@authup/core-kit';
import { RealmEntity } from '../realm/index.ts';
import { UserEntity } from '../user/index.ts';

@Entity({ name: 'auth_robots' })
@Unique(['name', 'realmId'])
export class RobotEntity implements Robot {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'varchar',
        length: 256,
        select: false, 
    })
    secret: string;

    @Column({
        type: 'varchar',
        length: 128, 
    })
    name: string;

    @Column({
        name: 'display_name', 
        type: 'varchar', 
        length: 256, 
        nullable: true, 
    })
    displayName: string | null;

    @Column({
        type: 'text',
        nullable: true, 
    })
    description: string;

    @Column({
        type: 'boolean',
        default: true, 
    })
    active: boolean;

    // ------------------------------------------------------------------

    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;

    // ------------------------------------------------------------------

    @Column({
        name: 'user_id', 
        nullable: true, 
        default: null, 
    })
    userId: User['id'] | null;

    @ManyToOne(() => UserEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'user_id' })
    user: User | null;

    // ------------------------------------------------------------------

    @Index()
    @Column({ name: 'client_id', nullable: true })
    clientId: Client['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'client_id' })
    client: Client | null;

    // ------------------------------------------------------------------

    @Index()
    @Column({ name: 'realm_id' })
    realmId: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
    realm: Realm;

    // ------------------------------------------------------------------

    @BeforeUpdate()
    @BeforeInsert()
    setName() {
        if (!this.name || this.name.length === 0) {
            this.name = createNanoID(36);
        }
    }
}
