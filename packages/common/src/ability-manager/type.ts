/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MongoQuery } from '@ucast/mongo2js';

export type AbilityID = {
    action: string,
    subject: string
};

export type AbilityDescriptor<T extends Record<string, any> = Record<string, any>> = {
    name: string,
    inverse?: boolean,
    condition?: MongoQuery<T> | null,
    fields?: string[] | null,
    target?: string | null,
    power?: number | null
};

export type Ability<T extends Record<string, any> = Record<any, any>> = AbilityID & AbilityDescriptor<T>;
