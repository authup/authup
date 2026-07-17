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
    Tree, 
    TreeChildren,
    TreeParent,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import { dateToISOStringTransformer } from '../../helpers/index.ts';
import type { Policy, Realm } from '@authup/core-kit';
import { RealmEntity } from '../realm/index.ts';

@Unique(['name', 'realmId'])
@Entity({ name: 'auth_policies' })
@Tree('closure-table', {
    closureTableName: 'auth_policy_tree',
    ancestorColumnName: () => 'ancestor_id',
    descendantColumnName: () => 'descendant_id',
})
export class PolicyEntity implements Policy {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        name: 'built_in', 
        type: 'boolean', 
        default: false, 
    })
    builtIn: boolean;

    @Column({
        type: 'varchar',
        length: 64, 
    })
    type: string;

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
    description: string | null;

    @Column({
        type: 'boolean',
        default: false, 
    })
    invert: boolean;

    @TreeChildren({ cascade: true })
    children: PolicyEntity[];

    @Column({ name: 'parent_id', nullable: true })
    parentId: Policy['id'] | null;

    @TreeParent({ onDelete: 'CASCADE' })
    @JoinColumn({ name: 'parent_id' })
    parent: Policy | null;

    @Index()
    @Column({ name: 'realm_id', nullable: true })
    realmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'realm_id' })
    realm: Realm | null;

    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;
}
