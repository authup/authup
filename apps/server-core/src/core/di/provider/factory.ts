/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import type { DependencyContainer } from '../module.ts';

export interface DIFactoryProvider<T> {
    useFactory: (dependencyContainer: DependencyContainer) => T
}

export function isFactoryProvider<T>(input: unknown) : input is DIFactoryProvider<T> {
    return isObject(input) && typeof input.useFactory === 'function';
}
