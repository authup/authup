/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IEntityRepository } from '@authup/server-kit';

export type OwnedDefinition = {
    id: string,
    clientId?: string | null,
};

/**
 * The definition (permission or role) a junction row binds, whose owning
 * client is the owner of the junction's record checks.
 */
export type JunctionDefinition = {
    /**
     * The junction column holding the definition id (`roleId`).
     */
    key: string,
    /**
     * The junction relation holding the definition (`role`).
     */
    relation: string,
    repository: Pick<IEntityRepository<OwnedDefinition>, 'findManyBy'>,
};

export type JunctionOwners = Map<string, string | null>;
