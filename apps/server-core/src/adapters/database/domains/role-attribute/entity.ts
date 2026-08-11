/*
 * Copyright (c) 2021-2021.
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
import type { Realm, Role, RoleAttribute } from '@authup/core-kit';
import {
    deserialize,
    serialize,
} from '@authup/kit';
import { RealmEntity } from '../realm/index.ts';
import { RoleEntity } from '../role/entity.ts';

@Unique(['name', 'roleId'])
@Entity({ name: 'auth_role_attributes' })
export class RoleAttributeEntity implements RoleAttribute {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'varchar',
        length: 255, 
    })
    name: string;

    @Column({
        type: 'text',
        nullable: true,
        transformer: {
            to(value: any): any {
                return serialize(value);
            },
            from(value: any): any {
                return deserialize(value);
            },
        },
    })
    value: string | null;

    // ------------------------------------------------------------------

    @Index()
    @Column({ name: 'realm_id', nullable: true })
    realmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'realm_id' })
    realm: RealmEntity | null;

    @Index()
    @Column({ name: 'role_id' })
    roleId: Role['id'];

    @ManyToOne(() => RoleEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'role_id' })
    role: RoleEntity;

    // ------------------------------------------------------------------

    @Index()
    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    @Index()
    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;
}
