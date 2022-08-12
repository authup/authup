/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Column,
    CreateDateColumn,
    Entity, Index, JoinColumn, ManyToOne, OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Realm, Role } from '@authelion/common';
import { RealmEntity } from '../realm';

@Entity({ name: 'auth_roles' })
export class RoleEntity implements Role {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'varchar', length: 64, unique: true })
        name: string;

    @Column({ type: 'varchar', length: 16, nullable: true })
        target: string | null;

    @Column({ type: 'text', nullable: true })
        description: string | null;

    // ------------------------------------------------------------------

    @Index()
    @Column({ nullable: true })
        realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'realm_id' })
        realm: Realm | null;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: string;

    @UpdateDateColumn()
        updated_at: string;
}
