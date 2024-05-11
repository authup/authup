/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventEmitter } from '@posva/event-emitter';
import { guard } from '@ucast/mongo2js';

import type { AbilitiesFilterOptions, Ability } from './types';

export class Abilities extends EventEmitter<{
    updated: []
}> {
    protected items: Ability[];

    // ----------------------------------------------

    constructor(input: Ability[] | Ability = []) {
        super();

        this.set(input);
    }

    // ----------------------------------------------

    /**
     * Check if permission is assigned with field and condition restriction.
     */
    satisfy(options: AbilitiesFilterOptions) : boolean;

    satisfy(name: string, options?: AbilitiesFilterOptions) : boolean;

    satisfy(name: AbilitiesFilterOptions | string, options: AbilitiesFilterOptions = {}) : boolean {
        let items : Ability[];
        if (typeof name === 'string') {
            options.name = name;
            if (typeof options.realmId === 'undefined') {
                options.realmId = null;
            }
            items = this.find(options);
        } else {
            items = this.find({
                ...name,
                ...options,
            });
        }

        return items.length > 0;
    }

    /**
     * Check if permission is assigned without any restrictions.
     *
     * @param name
     */
    has(name: string | string[]) : boolean {
        if (Array.isArray(name)) {
            return name.some((item) => this.has(item));
        }

        const items = this.find({
            name,
            realmId: null,
        });

        return items.length > 0;
    }

    // ----------------------------------------------

    /**
     * Find the first matching ability.
     *
     * @param input
     */
    findOne(input?: string | AbilitiesFilterOptions) : Ability | undefined {
        const items = this.find(input);
        if (items.length === 0) {
            return undefined;
        }

        return items[0];
    }

    /**
     * Find all matching abilities.
     *
     * @param input
     */
    find(input?: string | AbilitiesFilterOptions) : Ability[] {
        if (typeof input === 'undefined') {
            return this.items;
        }

        let options : AbilitiesFilterOptions;
        if (typeof input === 'string') {
            options = { name: input };
        } else {
            options = input;
        }

        const output : Ability[] = [];

        for (let i = 0; i < this.items.length; i++) {
            if (
                options.realmId === null &&
                typeof this.items[i].realmId !== 'undefined' &&
                this.items[i].realmId !== null
            ) {
                continue;
            }

            if (
                options.realmId &&
                this.items[i].realmId !== options.realmId
            ) {
                continue;
            }

            if (
                options.name &&
                this.items[i].name !== options.name
            ) {
                continue;
            }

            if (
                !options.inverse &&
                this.items[i].inverse
            ) {
                continue;
            }

            if (
                this.items[i].condition &&
                options.object
            ) {
                const test = guard(this.items[i].condition);
                if (!test(options.object)) {
                    continue;
                }
            }

            if (options.fn) {
                if (!options.fn(this.items[i])) {
                    continue;
                }
            }

            if (
                options.field &&
                this.items[i].fields
            ) {
                const fields = Array.isArray(options.field) ?
                    options.field :
                    [options.field];

                let index : number;
                let valid : boolean = true;
                for (let j = 0; j < fields.length; j++) {
                    index = this.items[i].fields.indexOf(fields[i]);
                    if (index === -1) {
                        valid = false;
                        break;
                    }
                }

                if (!valid) {
                    continue;
                }
            }

            if (
                options.target &&
                this.items[i].target &&
                this.items[i].target !== options.target
            ) {
                continue;
            }

            if (
                typeof options.power === 'number' &&
                typeof this.items[i].power === 'number' &&
                options.power > this.items[i].power
            ) {
                continue;
            }

            output.push(this.items[i]);
        }

        return output;
    }

    add(input: Ability) {
        this.addMany([input]);
    }

    addMany(input: Ability[]) {
        this.items.push(...input);
        this.sort();
        this.emit('updated');
    }

    set(input: Ability[] | Ability) {
        this.items = Array.isArray(input) ?
            input :
            [input];

        this.sort();
        this.emit('updated');
    }

    protected sort() {
        this.items
            .sort((a, b) => {
                if (typeof a.target === 'undefined' || a.target === null) {
                    return -1;
                }

                if (typeof b.target === 'undefined' || b.target === null) {
                    return 1;
                }

                return 0;
            })
            .sort((a, b) => b.power - a.power);
    }
}
