/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '../utils';
import { ObjectLiteral } from '../type';
import {
    ConfigContext,
    ConfigOptionTransformer,
    ConfigOptionsTransformer,
    ConfigOptionsValidators,
} from './type';
import { isConfigOptionValidatorResult } from './utils';

export class Config<
    O extends ObjectLiteral,
    I extends { [K in keyof O]?: any } = O,
> {
    protected options : Partial<O>;

    protected defaults: O;

    protected transformers: ConfigOptionsTransformer<O>;

    protected validators : ConfigOptionsValidators<O>;

    // -------------------------------------------------

    constructor(context: ConfigContext<O>) {
        this.options = context.options || {};
        this.defaults = context.defaults;
        this.transformers = context.transformers || {};
        this.validators = context.validators || {};
    }

    // -------------------------------------------------

    set(value: O) : this;

    set<K extends keyof O>(key: K, value: O[K]) : this;

    set<K extends keyof O>(key: (keyof O) | O, value?: O[K]) : this {
        if (typeof key === 'object') {
            const keys = Object.keys(key);
            for (let i = 0; i < keys.length; i++) {
                this.set(keys[i], key[keys[i]]);
            }

            return this;
        }

        const validator = this.validators[key];
        if (validator) {
            try {
                const output = validator(value);

                if (
                    isConfigOptionValidatorResult<O[K]>(output) &&
                    output.success
                ) {
                    this.options[key] = output.data;
                } else {
                    this.options[key] = value;
                }
            } catch (e) {
                // do nothing
            }

            return this;
        }

        this.options[key] = value;

        return this;
    }

    setRaw(value: I) : this;

    setRaw<K extends keyof O>(key: K, value: I[K]) : this;

    setRaw<K extends keyof O>(key: K | I, value?: I[K]) : this {
        if (typeof key === 'object') {
            const keys = Object.keys(key);
            for (let i = 0; i < keys.length; i++) {
                this.setRaw(keys[i], key[keys[i]]);
            }

            return this;
        }

        if (this.transformers[key]) {
            this.set(key, (this.transformers[key] as ConfigOptionTransformer<O[K]>)(value));
        } else if (this.validators[key]) {
            this.set(key, value as unknown as O[K]);
        }

        return this;
    }

    has(key: keyof O) : boolean {
        return hasOwnProperty(this.options, key);
    }

    // ----------------------------------------------

    reset() : this;

    reset(key: keyof O) : this;

    reset(keys: (keyof O)[]) : this;

    reset(key?: (keyof O) | (keyof O)[]) : this {
        if (typeof key === 'undefined') {
            this.options = {};
            return this;
        }

        if (Array.isArray(key)) {
            for (let i = 0; i < key.length; i++) {
                this.reset(key[i]);
            }

            return this;
        }

        if (hasOwnProperty(this.options, key)) {
            delete this.options[key];
        }

        return this;
    }

    // ----------------------------------------------

    get<K extends keyof O>(key: K) : O[K] {
        if (hasOwnProperty(this.options, key)) {
            return this.options[key] as O[K];
        }

        return this.defaults[key];
    }
}
