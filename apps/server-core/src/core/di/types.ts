/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Result } from '@authup/kit';
import type { DIFactoryProvider, DIValueProvider } from './provider/index.ts';

type ClassConstructor<T> = {
    new (...args: any[]): T;
};
export type DIKey<T = any> = ClassConstructor<T> | symbol | string;
export type DIProvider<T> = DIValueProvider<T> | DIFactoryProvider<T>;

export interface IDIContainer {
    resolve<T>(key: DIKey): T;

    safeResolve<T>(key: DIKey): Result<T>;

    register<T>(key: DIKey, value: DIProvider<T>): void;

    unregister(key: DIKey): void;
}
