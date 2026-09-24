/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityTarget, ObjectLiteral } from 'typeorm';
import type { IRealmRepository } from '../../../../../core/index.ts';

export type EntityRepositoryAdapterRealmScope = {
    /**
     * The column the per-row realm gate reads: `realmId` on an entity,
     * the owner realm key (`userRealmId`, `roleRealmId`, ...) on a junction.
     *
     * default: 'realmId'
     */
    column?: string,
    /**
     * Further columns the gate reads, e.g. an ownership short-circuit.
     */
    extraColumns?: string[],
};

export type EntityRepositoryAdapterOptions = {
    /**
     * The query builder alias every statement of the adapter uses.
     */
    alias: string,
    /**
     * The entity class, for join column and uniqueness checks.
     */
    target: EntityTarget<ObjectLiteral>,
    /**
     * Human readable name, used in the conflict error a duplicate key
     * raises on save (`The <entity> already exists.`).
     */
    entity: string,
    /**
     * Columns a `fields=` projection must not strip, because the per-row
     * realm gate reads them. Unset for an entity whose list is not gated
     * per row.
     */
    realmScope?: EntityRepositoryAdapterRealmScope,
    /**
     * Resolves a realm key (id or name) for name lookups. Without it the
     * entity has no name: `findOneByName` answers null and
     * `findOneByIdOrName` is a lookup by id.
     */
    realmRepository?: IRealmRepository,
    /**
     * The column a name lookup compares against.
     *
     * default: 'name'
     */
    nameColumn?: string,
    /**
     * Lock the row a single-row read returns (`FOR UPDATE`). Set on the
     * instance a transaction hands its callback.
     */
    lockRows?: boolean,
};
