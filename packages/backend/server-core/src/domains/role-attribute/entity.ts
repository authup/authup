/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Column,
    CreateDateColumn,
    Entity, Index, JoinColumn, ManyToOne,
    PrimaryGeneratedColumn, Unique,
    UpdateDateColumn,
} from 'typeorm';
import {
    Realm, Role, RoleAttribute,
} from '@authelion/common';
import { RealmEntity } from '../realm';
import { RoleEntity } from '../role';

@Unique(['key', 'role_id'])
@Entity({ name: 'auth_role_attributes' })
export class RoleAttributeEntity implements RoleAttribute {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'varchar', length: 255 })
        key: string;

    @Column({ type: 'text' })
        value: string;

    // ------------------------------------------------------------------

    @Column({ nullable: true })
        realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'realm_id' })
        realm: RealmEntity | null;

    @Column()
        role_id: Role['id'];

    @ManyToOne(() => RoleEntity, (entity) => entity.attributes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'role_id' })
        role: RoleEntity;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: string;

    @UpdateDateColumn()
        updated_at: string;
}
