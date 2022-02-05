/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Ability, AbilityBuilder, Subject } from '@casl/ability';
import { AbilityItem, AbilityMeta } from './type';
import { buildAbilityMetaFromName } from './utils';
import { PermissionItem } from '../permission';

export class AbilityManager {
    protected ability!: Ability;

    protected permissions!: PermissionItem<any>[];

    protected abilityItems: AbilityItem<any>[];

    constructor(permissions: PermissionItem<any>[] = []) {
        this.setPermissions(permissions);
    }

    // ----------------------------------------------

    can(action: string, subject: Subject, field?: string) : boolean {
        return this.ability.can(action, subject, field);
    }

    hasAbility(meta: AbilityMeta) : boolean {
        return this.ability.can(meta.action, meta.subject);
    }

    // ----------------------------------------------

    getPower(action: string, subject: Subject, field?: string) : undefined | number {
        if (typeof subject !== 'string') {
            return undefined;
        }

        let items = this.abilityItems.filter((abilityItem) => {
            const baseCheck : boolean = abilityItem.action === action && abilityItem.subject === subject;

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

    setPermissions(permissions: PermissionItem<any>[]) {
        this.permissions = permissions;
        this.build();
    }

    getPermissions() {
        return this.permissions;
    }

    getPermission(id: string) : PermissionItem<any> | undefined {
        const index : number = this.permissions.findIndex((permission) => permission.id === id);
        if (index === -1) {
            return undefined;
        }

        return this.permissions[index];
    }

    hasPermission(id: string) : boolean {
        const permission : PermissionItem<any> | undefined = this.getPermission(id);

        return typeof permission !== 'undefined';
    }

    // ----------------------------------------------
    // Ability
    // ----------------------------------------------

    protected transformPermissionsForAbilityBuilder() : AbilityItem<any>[] {
        const items = this.permissions.map((permission) => {
            const ability: AbilityItem<any> = {
                ...permission,
                ...buildAbilityMetaFromName(permission.id),
            };

            return ability;
        });

        this.abilityItems = items;

        return items;
    }

    protected build() : void {
        const items = this.transformPermissionsForAbilityBuilder();

        if (items.length === 0) {
            if (typeof this.ability === 'undefined') {
                this.ability = new Ability();
            } else {
                this.ability.update([]);
            }

            return;
        }

        const { can, rules } = new AbilityBuilder(Ability);

        for (let i = 0; i < items.length; i++) {
            const ability: AbilityItem<any> = items[i];

            can(ability.action, ability.subject, ability.fields, ability.condition);
        }

        if (typeof this.ability === 'undefined') {
            this.ability = new Ability(rules);
        } else {
            this.ability.update(rules);
        }
    }
}
