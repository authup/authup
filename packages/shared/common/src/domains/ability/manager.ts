/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Ability, AbilityBuilder, Subject } from '@casl/ability';

import {
    AbilityItem,
    AbilityItemConfig,
    AbilityItemMeta,
} from './type';
import { buildAbilityMetaFromName, transformAbilityStringSubject } from './utils';

export class AbilityManager {
    protected ability: Ability;

    protected items: AbilityItem[];

    // ----------------------------------------------

    constructor(input: AbilityItemConfig[] | AbilityItemConfig = []) {
        this.set(input);
    }

    // ----------------------------------------------

    can(action: string, subject: Subject, field?: string) : boolean {
        subject = transformAbilityStringSubject(subject);

        return this.ability.can(action, subject, field);
    }

    has(meta: AbilityItemMeta | AbilityItemMeta[] | string | string[]) : boolean {
        if (Array.isArray(meta)) {
            return meta.some((item) => this.has(item));
        }

        if (typeof meta === 'string') {
            meta = buildAbilityMetaFromName(meta);
        }

        return this.ability.can(meta.action, meta.subject);
    }

    // ----------------------------------------------

    hasPermission(id: string | string[]) : boolean {
        const ids = Array.isArray(id) ? id : [id];

        return ids.some((item) => this.has(item));
    }

    // todo: rename to 'satisfyCondition(predicate: (item: AbilityItem) => boolean | Partial<AbilityItem>)
    findPermission(id: string) : AbilityItem | undefined {
        const index = this.items.findIndex((permission) => permission.id === id);

        return index === -1 ? undefined : this.items[index];
    }

    // ----------------------------------------------
    // Power
    // ----------------------------------------------

    getPower(
        action: string,
        subject: Subject,
        field?: string,
    ) : undefined | number {
        subject = transformAbilityStringSubject(subject);

        let items = this.items.filter((abilityItem) => {
            if (abilityItem.action !== action || abilityItem.subject !== subject) {
                return false;
            }

            return this.can(action, subject, field);
        });

        if (items.length === 0) {
            return undefined;
        }

        items = items.sort((a, b) => {
            if (a.power === b.power) return 0;
            // desc
            /* istanbul ignore next */
            return a.power > b.power ? -1 : 1;
        });

        return items[0].power;
    }

    // ----------------------------------------------

    set(input: AbilityItemConfig[] | AbilityItemConfig, merge?: boolean) {
        const configurations = Array.isArray(input) ?
            input :
            [input];

        const items : AbilityItem[] = [];

        for (let i = 0; i < configurations.length; i++) {
            items[i] = {
                ...configurations[i],
                ...buildAbilityMetaFromName(configurations[i].id),
            };
        }

        if (merge) {
            // todo: check if unique !
            this.items = [...this.items, ...items];
        } else {
            this.items = items;
        }

        this.update();
    }

    protected update() : void {
        if (this.items.length === 0) {
            if (typeof this.ability === 'undefined') {
                this.ability = new Ability();
            } else {
                this.ability.update([]);
            }

            return;
        }

        const { can, rules } = new AbilityBuilder(Ability);

        for (let i = 0; i < this.items.length; i++) {
            const ability: AbilityItem = this.items[i];

            can(
                ability.action,
                ability.subject,
                ability.fields,
                ability.condition,
            );
        }

        if (this.ability) {
            this.ability.update(rules);
        } else {
            this.ability = new Ability(rules);
        }
    }
}
