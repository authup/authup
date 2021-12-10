/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Condition } from '../ability';

export type PermissionItem<T extends Record<string, any>> = {
    id: string,
    negation?: boolean,
    condition?: Condition<T> | null,
    fields?: string[] | null,
    power?: number | null
};
