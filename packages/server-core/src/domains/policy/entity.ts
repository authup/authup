/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PolicyType } from '@authup/kit';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn, Tree, TreeChildren, TreeParent,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import type {
    Policy,
} from '@authup/core-kit';
import { Realm } from '@authup/core-kit';
import { RealmEntity } from '../realm';

@Unique(['name', 'realm_id'])
@Entity({ name: 'auth_policies' })
@Tree('closure-table', {
    closureTableName: 'auth_policy_tree',
    ancestorColumnName: () => 'ancestor_id',
    descendantColumnName: () => 'descendant_id',
})
export class PolicyEntity implements Policy {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'varchar', length: 64 })
        type: `${PolicyType}`;

    @Column({ type: 'varchar', length: 128 })
        name: string;

    @Column({ type: 'text', nullable: true })
        description: string | null;

    @Column({ type: 'boolean', default: false })
        invert: boolean;

    @TreeChildren()
        children: PolicyEntity[];

    @TreeParent()
        parent: PolicyEntity;

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;

    @Column()
        realm_id: string | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
        realm: Realm | null;
}
