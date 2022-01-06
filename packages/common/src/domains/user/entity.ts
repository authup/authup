/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BeforeInsert, BeforeUpdate,
    Column,
    CreateDateColumn,
    Entity, Index, JoinColumn,
    ManyToOne, OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { OAuth2ProviderAccount } from '../oauth2-provider-account';
import { Realm } from '../realm';
import { UserRole } from '../user-role';

@Entity({ name: 'auth_users' })
export class User {
    @PrimaryGeneratedColumn({ unsigned: true })
        id: number;

    @Column({ type: 'varchar', length: 128 })
    @Index({ unique: true })
        name: string;

    @Column({ type: 'varchar', length: 128 })
        display_name: string;

    @Column({
        type: 'varchar', length: 255, default: null, nullable: true, select: false,
    })
        email: string;

    @Column({
        type: 'varchar', length: 512, default: null, nullable: true, select: false,
    })
        password: string;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;

    // ------------------------------------------------------------------

    @Column({ type: 'varchar' })
        realm_id: string;

    @ManyToOne(() => Realm, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
        realm: Realm;

    @OneToMany(() => UserRole, (userRole) => userRole.user)
        user_roles: UserRole[];

    @OneToMany(() => OAuth2ProviderAccount, (userAccount) => userAccount.user)
        oauth2_provider_accounts: OAuth2ProviderAccount[];

    // ------------------------------------------------------------------

    @BeforeInsert()
    @BeforeUpdate()
    setDisplayName() {
        if (typeof this.display_name !== 'string') {
            this.display_name = this.name;
        }
    }
}
