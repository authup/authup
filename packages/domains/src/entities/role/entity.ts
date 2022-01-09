/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Column,
    CreateDateColumn,
    Entity, Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'auth_roles' })
export class Role {
    @PrimaryGeneratedColumn({ unsigned: true })
        id: number;

    @Column({ type: 'varchar', length: 30 })
    @Index({ unique: true })
        name: string;

    @Column({ type: 'text', nullable: true })
        description: string;

    @CreateDateColumn()
        created_at: string;

    @UpdateDateColumn()
        updated_at: string;
}
