/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MongoQuery } from '@ucast/mongo2js';
import type { PolicyBase, PolicyDecisionStrategy } from '../policy';

export type AbilityCondition<T = any> = MongoQuery<T>;

export type Ability = {
    name: string,
    realmId?: string | null,
    decisionStrategy?: `${PolicyDecisionStrategy}`,
    policies?: PolicyBase[],
};

export type AbilitiesFilterOptions = {
    realmId?: string | null,
    name?: string,
    object?: Record<string, any>,
    fn?: (input: Ability) => boolean
};
