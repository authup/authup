/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Ability, AbilityBuilder, Subject } from '@casl/ability';
import { AbilityItem, AbilityMeta, PermissionMeta } from './type';
import { buildAbilityMetaFromName, transformAbilityStringSubject } from './utils';

export class AbilityManager {
    protected ability: Ability;

    protected permissions: PermissionMeta[];

    protected items: AbilityItem[];

    // ----------------------------------------------

    constructor(permissions: PermissionMeta[] = []) {
        this.setPermissions(permissions);
    }

    // ----------------------------------------------

    can(action: string, subject: Subject, field?: string) : boolean {
        subject = transformAbilityStringSubject(subject);

        return this.ability.can(action, subject, field);
    }

    // ----------------------------------------------

    hasAbilityMeta(meta: AbilityMeta) : boolean {
        return this.ability.can(meta.action, meta.subject);
    }

    // ----------------------------------------------
    // Permission(s)
    // ----------------------------------------------

    hasPermission(id: string) : boolean {
        return typeof this.findPermission(id) !== 'undefined';
    }

    setPermissions(permissions: PermissionMeta[]) {
        this.permissions = permissions;
        this.update();
    }

    getPermissions() {
        return this.permissions;
    }

    findPermission(id: string) : PermissionMeta | undefined {
        const index = this.permissions.findIndex((permission) => permission.id === id);

        return index === -1 ? undefined : this.permissions[index];
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
            const baseCheck : boolean = abilityItem.action === action &&
                abilityItem.subject === subject;

            if (!baseCheck) {
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
    // Ability
    // ----------------------------------------------

    protected update() : void {
        this.build();

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

    protected build() {
        const items : AbilityItem[] = [];

        for (let i = 0; i < this.permissions.length; i++) {
            items[i] = {
                ...this.permissions[i],
                ...buildAbilityMetaFromName(this.permissions[i].id),
            };
        }

        this.items = items;
    }
}
