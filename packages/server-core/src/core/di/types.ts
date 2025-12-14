/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';

export interface IDependencyContainer<
    CONTEXT extends ObjectLiteral = ObjectLiteral,
> {
    resolve<T extends keyof CONTEXT>(key: T): CONTEXT[T];

    register<T extends keyof CONTEXT>(key: T, value: CONTEXT[T]): void;

    unregister<T extends keyof CONTEXT>(key: T): void;
}
