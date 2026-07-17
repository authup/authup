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
import type { Policy, PolicyAttribute, Realm } from '@authup/core-kit';
import {
    deserialize,
    serialize,
} from '@authup/kit';
import { PolicyEntity } from '../policy/entity.ts';
import { RealmEntity } from '../realm/index.ts';

@Unique(['name', 'policyId'])
@Entity({ name: 'auth_policy_attributes' })
export class PolicyAttributeEntity implements PolicyAttribute {
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

    @Column({ name: 'realm_id', nullable: true })
    realmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'realm_id' })
    realm: RealmEntity | null;

    // ------------------------------------------------------------------

    @Column({ name: 'policy_id' })
    policyId: Policy['id'];

    @ManyToOne(() => PolicyEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'policy_id' })
    policy: PolicyEntity;

    // ------------------------------------------------------------------

    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;
}
