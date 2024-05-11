/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MongoQuery } from '@ucast/mongo2js';

export type AbilityCondition<T = any> = MongoQuery<T>;

export type Ability<T extends Record<string, any> = Record<string, any>> = {
    name: string,
    inverse?: boolean,
    condition?: AbilityCondition<T> | null,
    fields?: string[] | null,
    target?: string | null,
    power?: number | null,
    realmId?: string | null
};

export type AbilitiesFilterOptions = {
    realmId?: string | null,
    name?: string,
    inverse?: boolean,
    object?: Record<string, any>,
    field?: string | string[],
    target?: string,
    power?: number,
    fn?: (input: Ability) => boolean
};
