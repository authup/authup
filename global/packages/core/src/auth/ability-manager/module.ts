/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MongoQuery } from '@ucast/mongo2js';
import { guard } from '@ucast/mongo2js';

import type {
    Ability,
} from './type';

export class AbilityManager {
    protected items: Ability[];

    // ----------------------------------------------

    constructor(input: Ability[] | Ability = []) {
        this.set(input);
    }

    // ----------------------------------------------

    /**
     * Check if permission is assigned with field and condition restriction.
     *
     * @param action
     * @param subject
     * @param field
     */
    verify(
        action: string,
        subject?: Record<string, any>,
        field?: string,
    ) : boolean {
        const item = this.getOne(action, {
            withoutInverse: true,
            subject,
            field,
        });

        return !!item;
    }

    /**
     * Check if permission is assigned without field or condition restriction.
     *
     * @param action
     * @param withoutInverse
     */
    has(
        action: string | string[],
        withoutInverse = true,
    ) : boolean {
        if (Array.isArray(action)) {
            return action.some((item) => this.has(item));
        }

        const item = this.getOne(action, {
            withoutInverse,
        });

        return !!item;
    }

    // ----------------------------------------------

    satisfy(
        predicate: MongoQuery<Ability> | string,
        subject?: Record<string, any>,
    ) {
        const item = this.getOne(predicate, {
            subject,
        });

        return !!item;
    }

    // ----------------------------------------------

    getTarget(value: MongoQuery<Ability> | string) : string | null | undefined {
        let predicate : MongoQuery<Ability>;

        if (typeof value === 'string') {
            predicate = { name: { $eq: value } };
        } else {
            predicate = value;
        }

        const item = this.getOne(predicate, {
            sortFn: (a, b) => {
                if (typeof a.target === 'undefined' || a.target === null) {
                    return -1;
                }

                if (typeof b.target === 'undefined' || b.target === null) {
                    return 1;
                }

                return 0;
            },
        });

        return item ? item.target : undefined;
    }

    matchTarget(id: string | MongoQuery<Ability>, target?: string) {
        let basePredicate : MongoQuery<Ability>;
        if (typeof id === 'string') {
            basePredicate = {
                name: {
                    $eq: id,
                },
            };
        } else {
            basePredicate = id;
        }

        return [null, target].some((value) => this.satisfy({
            ...basePredicate,
            target: {
                $eq: value,
            },
        }));
    }

    // ----------------------------------------------

    getPower(
        id: string | MongoQuery<Ability>,
        direction: 'max' | 'min' = 'max',
    ) : undefined | number {
        let sortFn : (a : Ability, b: Ability) => number;

        if (direction === 'min') {
            sortFn = (a, b) => a.power - b.power;
        } else {
            sortFn = (a, b) => b.power - a.power;
        }

        const item = this.getOne(id, {
            withoutInverse: true,
            sortFn,
        });

        return item ? item.power : undefined;
    }

    // ----------------------------------------------

    getMany() : Ability[] {
        return this.items;
    }

    getOne(
        predicate: MongoQuery<Ability> | string,
        options: {
            withoutInverse?: boolean,
            field?: string,
            subject?: Record<string, any>,
            sortFn?: (a: Ability, b: Ability) => number,
        } = {},
    ) : Ability | undefined {
        if (typeof predicate === 'string') {
            predicate = {
                name: {
                    $eq: predicate,
                },
            };
        }

        const test = guard<Ability>(predicate);

        options = options || {};

        if (typeof options.sortFn !== 'undefined') {
            this.items.sort(options.sortFn);
        }

        for (let i = 0; i < this.items.length; i++) {
            if (!test(this.items[i])) {
                // eslint-disable-next-line no-continue
                continue;
            }

            if (
                this.items[i].condition &&
                options.subject
            ) {
                const conditionTest = guard(this.items[i].condition);
                if (!conditionTest(options.subject)) {
                    // eslint-disable-next-line no-continue
                    continue;
                }
            }

            if (
                this.items[i].fields &&
                options.field
            ) {
                const index = this.items[i].fields.indexOf(options.field);
                if (index === -1) {
                    // eslint-disable-next-line no-continue
                    continue;
                }
            }

            if (
                options.withoutInverse &&
                this.items[i].inverse
            ) {
                // eslint-disable-next-line no-continue
                continue;
            }

            return this.items[i];
        }

        return undefined;
    }

    set(
        input: Ability[] | Ability,
        merge?: boolean,
    ) {
        const items = Array.isArray(input) ?
            input :
            [input];

        if (merge) {
            // todo: check if unique !
            this.items = [...this.items, ...items];
        } else {
            this.items = items;
        }
    }
}
