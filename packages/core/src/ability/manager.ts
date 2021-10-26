/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {OwnedAbility} from "./type";
import {Ability, AbilityBuilder, Subject} from "@casl/ability";
import {buildAbilityMetaFromName} from "./utils";
import {Permission} from "../permission";

export class AbilityManager {
    protected ability!: Ability;

    protected permissions!: Permission<unknown>[];
    protected abilityItems: OwnedAbility<unknown>[];

    constructor(permissions: Permission<unknown>[] = []) {
        this.setPermissions(permissions);
    }

    // ----------------------------------------------

    can(action: string, subject: Subject, field?: string) {
        return this.ability.can(action, subject, field);
    }

    getPower(action: string, subject: Subject, field?: string) : undefined | number {
        if(typeof subject !== 'string') {
            return undefined;
        }

        let items = this.abilityItems.filter(abilityItem => {
            const baseCheck : boolean = abilityItem.action === action && abilityItem.subject === subject;

            if(!baseCheck) {
                return false;
            }

            return this.can(action, subject, field);
        });

        if(items.length === 0) {
            return undefined;
        }

        items = items.sort((a,b) => {
            if(a.power === b.power) return 0;
            // desc
            /* istanbul ignore next */
            return a.power > b.power ? -1 : 1;
        });

        return items[0].power;
    }

    // ----------------------------------------------

    setPermissions(permissions: Permission<any>[]) {
        this.permissions = permissions;
        this.build();
    }
    getPermissions() {
        return this.permissions;
    }

    getPermission(id: string) : Permission<unknown> | undefined {
        const index : number = this.permissions.findIndex(permission => permission.id === id);
        if(index === -1) {
            return undefined;
        }

        return this.permissions[index];
    }

    hasPermission(id: string) : boolean {
        const permission : Permission<unknown> | undefined = this.getPermission(id);

        return typeof permission !== 'undefined';
    }

    // ----------------------------------------------
    // Ability
    // ----------------------------------------------

    protected transformPermissionsForAbilityBuilder() : OwnedAbility<unknown>[] {
        const items =  this.permissions.map(permission => {
            const ability: OwnedAbility<unknown> = {
                ...permission,
                ...buildAbilityMetaFromName(permission.id)
            };

            return ability;
        });

        this.abilityItems = items;

        return items;
    }

    protected build() : void {
        const items = this.transformPermissionsForAbilityBuilder();

        if (items.length === 0) {
            if(typeof this.ability === 'undefined') {
                this.ability = new Ability();
            } else {
                this.ability.update([]);
            }

            return;
        }

        const {can, rules} = new AbilityBuilder(Ability);

        for (let i = 0; i < items.length; i++) {
            const ability: OwnedAbility<unknown> = items[i];

            can(ability.action, ability.subject, ability.fields, ability.condition);
        }

        if(typeof this.ability === 'undefined') {
            this.ability = new Ability(rules);
        } else {
            this.ability.update(rules);
        }
    }
}
