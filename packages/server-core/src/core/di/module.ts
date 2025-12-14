/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { AuthupError } from '@authup/errors';
import type { ObjectLiteral } from '@authup/kit';
import type { IDependencyContainer } from './types';

export class DependencyContainer<
    CONTEXT extends ObjectLiteral = ObjectLiteral,
> implements IDependencyContainer<CONTEXT> {
    protected instances: Partial<CONTEXT>;

    // ----------------------------------------------------

    constructor() {
        this.instances = {};
    }

    // ----------------------------------------------------

    resolve<T extends keyof CONTEXT>(key: T): CONTEXT[T] {
        const instance = this.instances[key];

        if (typeof instance === 'undefined') {
            throw new AuthupError(`${String(key)} is no initialized.`);
        }

        return instance;
    }

    // ----------------------------------------------------

    register<T extends keyof CONTEXT>(key: T, value: CONTEXT[T]): void {
        this.instances[key] = value;
    }

    unregister<T extends keyof CONTEXT>(key: T): void {
        delete this.instances[key];
    }
}
