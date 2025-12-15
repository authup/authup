/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type DependencyInjectionKey = symbol | string;

export interface IDependencyContainer {
    resolve<T>(key: DependencyInjectionKey): T;

    register<T>(key: DependencyInjectionKey, value: T): void;

    unregister(key: DependencyInjectionKey): void;
}
