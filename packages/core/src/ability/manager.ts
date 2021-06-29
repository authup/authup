import {OwnedAbility} from "./type";
import {Ability, AbilityBuilder, Subject} from "@casl/ability";
import {createAbilityKeysFromPermissionID} from "./utils";
import {OwnedPermission} from "../permission";

export class AbilityManager {
    protected ability!: Ability;

    protected permissions: OwnedPermission<unknown>[];
    protected abilityItems: OwnedAbility<unknown>[];

    constructor(permissions: OwnedPermission<unknown>[]) {
        this.permissions = permissions;

        this.build();
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
            // desc order
            return a.power > b.power ? -1 : 1;
        });

        return items[0].power;
    }

    // ----------------------------------------------

    getPermission(id: string) : OwnedPermission<unknown> | undefined {
        const index : number = this.permissions.findIndex(permission => permission.id === id);
        if(index === -1) {
            return undefined;
        }

        return this.permissions[index];
    }

    hasPermission(id: string) : boolean {
        const permission : OwnedPermission<unknown> | undefined = this.getPermission(id);

        return typeof permission !== 'undefined';
    }

    // ----------------------------------------------
    // Ability
    // ----------------------------------------------

    protected transformPermissionsForAbilityBuilder() : OwnedAbility<unknown>[] {
        const items =  this.permissions.map(permission => {
            const ability: OwnedAbility<unknown> = {
                ...permission,
                ...createAbilityKeysFromPermissionID(permission.id)
            };

            return ability;
        });

        this.abilityItems = items;

        return items;
    }

    protected build() : void {
        const items = this.transformPermissionsForAbilityBuilder();

        if (items.length === 0) {
            this.ability = new Ability();
            return;
        }

        const {can, rules} = new AbilityBuilder(Ability);

        for (let i = 0; i < items.length; i++) {
            const ability: OwnedAbility<unknown> = items[i];

            can(ability.action, ability.subject, ability.fields, ability.condition);
        }

        this.ability =  new Ability(rules);
    }
}
