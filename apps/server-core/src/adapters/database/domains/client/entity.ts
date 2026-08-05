/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BeforeInsert, 
    BeforeUpdate,
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
import {
    type Client,
    ClientAuthMethod,
    ClientTokenBindingMethod,
    type Policy,
    type Realm,
} from '@authup/core-kit';
import { PolicyEntity } from '../policy/index.ts';
import { RealmEntity } from '../realm/index.ts';

@Entity({ name: 'auth_clients' })
@Unique(['name', 'realmId'])
export class ClientEntity implements Client {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // ------------------------------------------------------------------

    @Column({
        type: 'boolean',
        default: true,
    })
    active: boolean;

    @Column({
        name: 'built_in', 
        type: 'boolean', 
        default: false, 
    })
    builtIn: boolean;

    @Column({
        name: 'auth_method', 
        type: 'varchar', 
        length: 16, 
        default: ClientAuthMethod.NONE, 
    })
    authMethod: `${ClientAuthMethod}`;

    @Column({
        name: 'token_binding_method', 
        type: 'varchar', 
        length: 16, 
        default: ClientTokenBindingMethod.NONE, 
    })
    tokenBindingMethod: `${ClientTokenBindingMethod}`;

    // ------------------------------------------------------------------

    @Column({
        type: 'varchar',
        length: 256,
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

    // ------------------------------------------------------------------

    @Column({
        type: 'varchar',
        length: 256,
        select: false,
        nullable: true,
    })
    secret: string | null;

    @Column({
        name: 'secret_hashed', 
        type: 'boolean', 
        default: false, 
    })
    secretHashed: boolean;

    @Column({
        name: 'secret_encrypted', 
        type: 'boolean', 
        default: false, 
    })
    secretEncrypted: boolean;

    // ------------------------------------------------------------------

    @Column({
        name: 'redirect_uri', 
        type: 'text', 
        nullable: true, 
    })
    redirectUri: string | null;

    // `text` (not varchar) to match `redirectUri` — the provisioner writes the
    // same origin-pattern string to both, so a large trusted-origin set must
    // not overflow only this column.
    @Column({
        name: 'post_logout_redirect_uri', 
        type: 'text', 
        nullable: true, 
    })
    postLogoutRedirectUri: string | null;

    @Column({
        name: 'access_policy_id', 
        nullable: true, 
        type: 'uuid', 
    })
    accessPolicyId: string | null;

    @ManyToOne(() => PolicyEntity, {
        onDelete: 'SET NULL',
        nullable: true,
    })
    @JoinColumn({
        name: 'access_policy_id',
        foreignKeyConstraintName: 'FK_auth_clients_access_policy_id',
    })
    accessPolicy: Policy | null;

    @Column({
        name: 'grant_types', 
        type: 'varchar', 
        length: 512, 
        nullable: true, 
    })
    grantTypes: string | null;

    @Column({
        type: 'varchar',
        length: 512,
        nullable: true,
        default: null,
    })
    scope: string | null;

    @Column({
        name: 'base_url', 
        type: 'varchar', 
        length: 2000, 
        nullable: true, 
    })
    baseUrl: string | null;

    @Column({
        name: 'root_url', 
        type: 'varchar', 
        length: 2000, 
        nullable: true, 
    })
    rootUrl: string | null;

    // ------------------------------------------------------------------

    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;

    // ------------------------------------------------------------------

    @Column({ name: 'realm_id' })
    realmId: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
    realm: RealmEntity;

    // ------------------------------------------------------------------

    @BeforeInsert()
    @BeforeUpdate()
    setDisplayName() {
        if (
            typeof this.displayName !== 'string' ||
            this.displayName.length === 0
        ) {
            this.displayName = this.name;
        }
    }
}
