/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventEmitter } from '@posva/event-emitter';
import { PolicyDecisionStrategy, evalGroupPolicy } from '../policy';

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
     * Check if permission is assigned without evaluation of any policies.
     *
     * @param name
     * @param target
     */
    has(name: string | string[], target?: Record<string, any>) : boolean {
        if (Array.isArray(name)) {
            return name.some((item) => this.has(item));
        }

        const items = this.find({
            name,
            realmId: null,
        });

        if (items.length === 0) {
            return false;
        }

        let hasPolicies = false;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.policies) {
                continue;
            }

            hasPolicies = true;
            const outcome = evalGroupPolicy(
                {
                    invert: false,
                    children: item.policies,
                    decisionStrategy: item.decisionStrategy || PolicyDecisionStrategy.UNANIMOUS,
                },
                target,
            );

            if (outcome) {
                return true;
            }
        }

        return !hasPolicies;
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

            if (options.fn) {
                if (!options.fn(this.items[i])) {
                    continue;
                }
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
        this.emit('updated');
    }

    set(input: Ability[] | Ability) {
        this.items = Array.isArray(input) ?
            input :
            [input];

        this.emit('updated');
    }
}
