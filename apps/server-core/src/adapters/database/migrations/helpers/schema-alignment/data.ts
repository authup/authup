/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ColumnTypeChange, ForeignKeyRename, IndexRename } from './types.ts';

/**
 * Index names written by the hand-authored migrations 1783325495597 and
 * 1783769340000, mapped onto the names typeorm derives from the entity
 * metadata (table + columns). Both dialects deviate identically.
 */
export const INDEX_RENAMES : IndexRename[] = [
    {
        table: 'auth_consents',
        from: 'IDX_auth_consents_sub',
        to: 'IDX_482fa13b8f47218a844e333282',
    },
    {
        table: 'auth_consents',
        from: 'IDX_auth_consents_client_id',
        to: 'IDX_adc5a3c5fa915f59ddac529f2b',
    },
    {
        table: 'auth_consents',
        from: 'IDX_auth_consents_realm_id',
        to: 'IDX_089778fa70ab97a637b84957a8',
    },
    {
        table: 'auth_consents',
        from: 'IDX_auth_consents_user_id',
        to: 'IDX_f945cd1ec65cc16e8462384d3a',
    },
    {
        table: 'auth_events',
        from: 'IDX_auth_events_client_id',
        to: 'IDX_e50f1f5e014087edaac7240ba9',
    },
    {
        table: 'auth_events',
        from: 'IDX_auth_events_actor_id',
        to: 'IDX_a5cc98d786bf9fce973ab2594f',
    },
    {
        table: 'auth_events',
        from: 'IDX_auth_events_actor_name',
        to: 'IDX_ce33c3f58b802bb3c7b2668adc',
    },
    {
        table: 'auth_events',
        from: 'IDX_auth_events_request_ip_address',
        to: 'IDX_5fafa06904d87cf1d77bbf4564',
    },
    {
        table: 'auth_events',
        from: 'IDX_auth_events_realm_id',
        to: 'IDX_5a0f436c6949aeb968db4f2473',
    },
    {
        table: 'auth_events',
        from: 'IDX_auth_events_expiring',
        to: 'IDX_0c8183e935c03317f4829cb427',
    },
    {
        table: 'auth_events',
        from: 'IDX_auth_events_expires_at',
        to: 'IDX_1db311adb485ecbefd92c5daf8',
    },
    {
        table: 'auth_events',
        from: 'IDX_auth_events_created_at',
        to: 'IDX_64ac9bded13b2b6b75b128d8e5',
    },
    {
        table: 'auth_events',
        from: 'IDX_auth_events_ref_type_ref_id',
        to: 'IDX_12ed04e1591ed2574d1324070b',
    },
    {
        table: 'auth_events',
        from: 'IDX_auth_events_name_scope',
        to: 'IDX_85536e251a24fe5141925ee3f9',
    },
    {
        table: 'auth_session_tokens',
        from: 'IDX_auth_session_tokens_session_id',
        to: 'IDX_cdedfe142e7b60c17140fc19d8',
    },
    {
        table: 'auth_session_tokens',
        from: 'IDX_auth_session_tokens_kind',
        to: 'IDX_37121db8ac9517c083c473b95c',
    },
    {
        table: 'auth_session_tokens',
        from: 'IDX_auth_session_tokens_expires_at',
        to: 'IDX_2a86161c2eae4ef90aee1fa657',
    },
    {
        table: 'auth_trust_anchors',
        from: 'IDX_auth_trust_anchors_realm_id',
        to: 'IDX_68b091bb8e853316ad1f953673',
    },
    {
        table: 'auth_user_authenticators',
        from: 'IDX_auth_user_authenticators_kind',
        to: 'IDX_e89cdcc8924d5fef9ae47d49d8',
    },
    {
        table: 'auth_user_authenticators',
        from: 'IDX_auth_user_authenticators_user_id',
        to: 'IDX_ed232e3a899e0556f1b052bc50',
    },
];

/**
 * Foreign key constraint names, same origin as INDEX_RENAMES.
 */
export const FOREIGN_KEY_RENAMES : ForeignKeyRename[] = [
    {
        table: 'auth_clients',
        column: 'access_policy_id',
        from: 'FK_auth_clients_access_policy_id',
        to: 'FK_7e7bca0ba30295b43b02a690511',
        referencedTable: 'auth_policies',
        referencedColumn: 'id',
        onDelete: 'SET NULL',
        onUpdate: 'NO ACTION',
    },
    {
        table: 'auth_consents',
        column: 'client_id',
        from: 'FK_auth_consents_client_id',
        to: 'FK_adc5a3c5fa915f59ddac529f2b2',
        referencedTable: 'auth_clients',
        referencedColumn: 'id',
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
    },
    {
        table: 'auth_consents',
        column: 'realm_id',
        from: 'FK_auth_consents_realm_id',
        to: 'FK_089778fa70ab97a637b84957a84',
        referencedTable: 'auth_realms',
        referencedColumn: 'id',
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
    },
    {
        table: 'auth_consents',
        column: 'user_id',
        from: 'FK_auth_consents_user_id',
        to: 'FK_f945cd1ec65cc16e8462384d3a8',
        referencedTable: 'auth_users',
        referencedColumn: 'id',
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
    },
    {
        table: 'auth_session_tokens',
        column: 'session_id',
        from: 'FK_auth_session_tokens_session_id',
        to: 'FK_cdedfe142e7b60c17140fc19d8a',
        referencedTable: 'auth_sessions',
        referencedColumn: 'id',
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
    },
    {
        table: 'auth_trust_anchors',
        column: 'realm_id',
        from: 'FK_auth_trust_anchors_realm_id',
        to: 'FK_68b091bb8e853316ad1f9536731',
        referencedTable: 'auth_realms',
        referencedColumn: 'id',
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
    },
    {
        table: 'auth_user_authenticators',
        column: 'user_id',
        from: 'FK_auth_user_authenticators_user_id',
        to: 'FK_ed232e3a899e0556f1b052bc50e',
        referencedTable: 'auth_users',
        referencedColumn: 'id',
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
    },
    {
        table: 'auth_user_authenticators',
        column: 'realm_id',
        from: 'FK_auth_user_authenticators_realm_id',
        to: 'FK_db13de293f01ac8ab7bc0342c4f',
        referencedTable: 'auth_realms',
        referencedColumn: 'id',
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
    },
];

/**
 * MySQL only: the same two migrations declared uuid columns as
 * varchar(36) while typeorm's mysql driver derives varchar(255) for
 * `type: 'uuid'` (it only shortens to 36 when it generates the value
 * itself — MysqlDriver.getColumnLength). Postgres has a native uuid
 * type and is unaffected.
 */
export const MYSQL_COLUMN_TYPE_CHANGES : ColumnTypeChange[] = [
    {
        table: 'auth_clients',
        column: 'access_policy_id',
        nullable: true,
        from: 'varchar(36)',
        to: 'varchar(255)',
    },
    {
        table: 'auth_consents',
        column: 'client_id',
        nullable: false,
        from: 'varchar(36)',
        to: 'varchar(255)',
    },
    {
        table: 'auth_consents',
        column: 'realm_id',
        nullable: false,
        from: 'varchar(36)',
        to: 'varchar(255)',
    },
    {
        table: 'auth_consents',
        column: 'user_id',
        nullable: true,
        from: 'varchar(36)',
        to: 'varchar(255)',
    },
    {
        table: 'auth_events',
        column: 'id',
        nullable: false,
        from: 'varchar(36)',
        to: 'varchar(255)',
    },
    {
        table: 'auth_events',
        column: 'client_id',
        nullable: true,
        from: 'varchar(36)',
        to: 'varchar(255)',
    },
    {
        table: 'auth_events',
        column: 'actor_id',
        nullable: true,
        from: 'varchar(36)',
        to: 'varchar(255)',
    },
    {
        table: 'auth_events',
        column: 'realm_id',
        nullable: true,
        from: 'varchar(36)',
        to: 'varchar(255)',
    },
    {
        table: 'auth_session_tokens',
        column: 'id',
        nullable: false,
        from: 'varchar(36)',
        to: 'varchar(255)',
    },
    {
        table: 'auth_session_tokens',
        column: 'session_id',
        nullable: false,
        from: 'varchar(36)',
        to: 'varchar(255)',
    },
    {
        table: 'auth_session_tokens',
        column: 'parent_id',
        nullable: true,
        from: 'varchar(36)',
        to: 'varchar(255)',
    },
    {
        table: 'auth_session_tokens',
        column: 'refresh_token_id',
        nullable: true,
        from: 'varchar(36)',
        to: 'varchar(255)',
    },
    {
        table: 'auth_trust_anchors',
        column: 'realm_id',
        nullable: false,
        from: 'varchar(36)',
        to: 'varchar(255)',
    },
    {
        table: 'auth_user_authenticators',
        column: 'user_id',
        nullable: false,
        from: 'varchar(36)',
        to: 'varchar(255)',
    },
    {
        table: 'auth_user_authenticators',
        column: 'realm_id',
        nullable: false,
        from: 'varchar(36)',
        to: 'varchar(255)',
    },
];

export function invertIndexRenames(renames: IndexRename[]) : IndexRename[] {
    return renames.map((rename) => ({
        ...rename, 
        from: rename.to, 
        to: rename.from, 
    }));
}

export function invertForeignKeyRenames(renames: ForeignKeyRename[]) : ForeignKeyRename[] {
    return renames.map((rename) => ({
        ...rename, 
        from: rename.to, 
        to: rename.from, 
    }));
}

export function invertColumnTypeChanges(changes: ColumnTypeChange[]) : ColumnTypeChange[] {
    return changes.map((change) => ({
        ...change, 
        from: change.to, 
        to: change.from, 
    }));
}
