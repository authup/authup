/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ObjectLiteral } from '../type';

export type ConfigOptionTransformer<V> = (value: unknown) => V;

export type ConfigContext<T extends ObjectLiteral> = {
    defaults: T,
    options?: Partial<T>,
    transform: {
        [K in keyof T]: ConfigOptionTransformer<T[K]>
    }
};
