/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Column,
    CreateDateColumn,
    Entity, JoinColumn, ManyToOne,
    PrimaryGeneratedColumn, Unique,
    UpdateDateColumn,
} from 'typeorm';
import type { Policy, PolicyAttribute } from '@authup/core-kit';
import {
    deserialize,
    serialize,
} from '@authup/kit';
import { PolicyEntity } from '../policy/entity';

@Unique(['name', 'policy_id'])
@Entity({ name: 'auth_policy_attributes' })
export class PolicyAttributeEntity implements PolicyAttribute {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'varchar', length: 255 })
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

    @Column()
        policy_id: Policy['id'];

    @ManyToOne(() => PolicyEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'policy_id' })
        policy: PolicyEntity;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;
}
