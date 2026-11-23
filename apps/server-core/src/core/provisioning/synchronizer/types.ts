/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type ProvisioningEntityResolverOptions = {
    /**
     * Whether the resolved entity carries a `clientId` column.
     *
     * Permissions and roles are client-ownable, so their lookups pin the
     * client dimension. Scopes have none, so leaving the predicate in would
     * make the query fail against the table. Defaults to true.
     */
    clientScoped?: boolean
};

export type OwnedEntityAttributes = {
    name?: string | null,
    realmId?: string | null,
    clientId?: string | null,
};

export type OwnedEntityLookupResult<T> = {
    entity: T | null,
    /**
     * The row is client-owned and stored without its client's realm.
     */
    realmless: boolean,
};
