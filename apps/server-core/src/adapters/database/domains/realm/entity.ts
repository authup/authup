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
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { dateToISOStringTransformer } from '../../helpers/index.ts';
import type { Realm } from '@authup/core-kit';

@Entity({ name: 'auth_realms' })
export class RealmEntity implements Realm {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'varchar',
        length: 128,
        unique: true, 
    })
    name: string;

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
        default: null, 
    })
    description: string | null;

    @Index()
    @Column({
        name: 'built_in', 
        type: 'boolean', 
        default: false, 
    })
    builtIn: boolean;

    @Index()
    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    @Index()
    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;
}
