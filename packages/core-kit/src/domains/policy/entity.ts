/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '../realm';

export type PolicyWithType<
    R extends Record<string, any> = Record<string, any>,
    T = string,
> = R & {
    type: T
};

export interface Policy {
    id: string;

    builtIn: boolean;

    type: string;

    name: string;

    displayName: string | null;

    description: string | null;

    invert: boolean;

    children: PolicyWithType<Policy>[];

    parentId: Policy['id'] | null;

    parent: PolicyWithType<Policy> | null;

    // ------------------------------------------------------------------

    realmId: Realm['id'] | null;

    realm: Realm | null;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;
}
