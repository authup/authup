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
