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
    JoinColumn, 
    ManyToOne,
    PrimaryGeneratedColumn, 
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import { dateToISOStringTransformer } from '../../helpers/index.ts';
import type { Realm, User, UserAttribute } from '@authup/core-kit';
import { deserialize, serialize } from '@authup/kit';
import { RealmEntity } from '../realm/index.ts';
import { UserEntity } from '../user/entity.ts';

@Unique(['name', 'userId'])
@Entity({ name: 'auth_user_attributes' })
export class UserAttributeEntity implements UserAttribute {
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

    @Column({ name: 'realm_id' })
    realmId: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
    realm: RealmEntity;

    @Column({ name: 'user_id' })
    userId: User['id'];

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;

    // ------------------------------------------------------------------

    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;
}
