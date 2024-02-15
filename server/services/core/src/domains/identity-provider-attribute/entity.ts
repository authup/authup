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
import type { IdentityProvider, IdentityProviderAttribute } from '@authup/core';
import {
    deserialize, serialize,
} from '@authup/core';
import { IdentityProviderEntity } from '../identity-provider/entity';

@Unique(['name', 'provider_id'])
@Entity({ name: 'auth_identity_provider_attributes' })
export class IdentityProviderAttributeEntity implements IdentityProviderAttribute {
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
        provider_id: IdentityProvider['id'];

    @ManyToOne(() => IdentityProviderEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'provider_id' })
        provider: IdentityProviderEntity;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: string;

    @UpdateDateColumn()
        updated_at: string;
}
