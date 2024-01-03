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
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import type { Realm } from '@authup/core';

@Entity({ name: 'auth_realms' })
export class RealmEntity implements Realm {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'varchar', length: 128, unique: true })
        name: string;

    @Column({ type: 'text', nullable: true, default: null })
        description: string | null;

    @Column({ default: true })
        built_in: boolean;

    @CreateDateColumn()
        created_at: string;

    @UpdateDateColumn()
        updated_at: string;
}
