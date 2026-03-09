/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import type { Result } from '@authup/kit';
import { isFactoryProvider, isValueProvider } from './provider/index.ts';
import type { DIKey, DIProvider, IDIContainer } from './types.ts';

export class DependencyContainer implements IDIContainer {
    protected factories: Map<DIKey, DIProvider<any>>;

    protected instances : Map<DIKey, any>;

    // ----------------------------------------------------

    constructor() {
        this.factories = new Map();
        this.instances = new Map();
    }

    // ----------------------------------------------------

    resolve<T>(key: DIKey): T {
        let instance = this.instances.get(key);
        if (instance) {
            return instance;
        }

        instance = this.createInstance(key);

        this.instances.set(key, instance);

        return instance;
    }

    safeResolve<T>(key: DIKey): Result<T> {
        try {
            const data = this.resolve<T>(key);

            return { success: true, data };
        } catch (e) {
            return { success: false, error: e as Error };
        }
    }

    // ----------------------------------------------------

    register<T>(key: DIKey, value: DIProvider<T>): void {
        this.factories.set(key, value);
    }

    unregister(key: DIKey): void {
        this.factories.delete(key);
    }

    // ----------------------------------------------------

    protected createInstance<T>(key: DIKey) : T {
        const factory = this.factories.get(key);

        if (typeof factory === 'undefined') {
            throw new AuthupError(`Not factory for ${String(key)} defined.`);
        }

        if (isFactoryProvider(factory)) {
            return factory.useFactory(this) as T;
        }

        if (isValueProvider(factory)) {
            return factory.useValue as T;
        }

        throw new AuthupError('Not factory pattern found.');
    }
}
