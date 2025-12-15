/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { AuthupError } from '@authup/errors';
import type { FactoryProvider, ValueProvider } from 'tsyringe';
import { isFactoryProvider, isValueProvider } from './provider';
import type { DependencyInjectionKey, IDependencyContainer } from './types';

export class DependencyContainer implements IDependencyContainer {
    protected factories: Map<DependencyInjectionKey, ValueProvider<any> | FactoryProvider<any>>;

    protected instances : Map<DependencyInjectionKey, any>;

    // ----------------------------------------------------

    constructor() {
        this.factories = new Map();
        this.instances = new Map();
    }

    // ----------------------------------------------------

    resolve<T>(key: DependencyInjectionKey): T {
        let instance = this.instances.get(key);
        if (instance) {
            return instance;
        }

        instance = this.createInstance(key);

        this.instances.set(key, instance);

        return instance;
    }

    // ----------------------------------------------------

    register<T>(key: DependencyInjectionKey, value: ValueProvider<T> | FactoryProvider<T>): void {
        this.factories.set(key, value);
    }

    unregister(key: DependencyInjectionKey): void {
        this.factories.delete(key);
    }

    // ----------------------------------------------------

    protected createInstance<T>(key: DependencyInjectionKey) : T {
        const factory = this.factories.get(key);

        if (typeof factory === 'undefined') {
            throw new AuthupError(`Not factory for ${String(key)} defined.`);
        }

        if (isFactoryProvider(factory)) {
            return factory.useFactory(this);
        }

        if (isValueProvider(factory)) {
            return factory.useValue;
        }

        throw new AuthupError('Not factory pattern found.');
    }
}
