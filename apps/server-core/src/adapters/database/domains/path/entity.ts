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
import {
    PATH_MAX_LENGTH,
    PATH_SEGMENT_MAX_LENGTH,
    type Path,
    type Realm,
} from '@authup/core-kit';
import { RealmEntity } from '../realm/index.ts';

@Entity({ name: 'auth_paths' })
@Unique(['path', 'realmId'])
export class PathEntity implements Path {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'varchar',
        length: PATH_SEGMENT_MAX_LENGTH,
    })
    name: string;

    // The full slash path, derived from the parent chain by the service and
    // never accepted from a caller. What the URL, the prefix filter, the tree
    // and uniqueness read.
    @Column({
        type: 'varchar',
        length: PATH_MAX_LENGTH,
    })
    path: string;

    @Index()
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

    // ------------------------------------------------------------------

    @Index()
    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    @Index()
    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;

    // ------------------------------------------------------------------

    @Index()
    @Column({
        name: 'parent_id',
        type: 'uuid',
        nullable: true,
    })
    parentId: Path['id'] | null;

    @ManyToOne(() => PathEntity, {
        onDelete: 'CASCADE',
        nullable: true,
    })
    @JoinColumn({ name: 'parent_id' })
    parent: Path | null;

    @Index()
    @Column({ name: 'realm_id' })
    realmId: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
    realm: Realm;
}
