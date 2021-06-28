import {AbstractPermission} from "./type";
import {Ability, AbilityBuilder} from "@casl/ability";
import {AuthAbility, transformScopeToAbility} from "../utils/permission";

class PermissionManager {
    private readonly ability: any;
    private readonly abilities: any;

    constructor(private permissions: AbstractPermission<any>[]) {
        this.abilities = PermissionManager.transformPermissionsToAbilities(permissions);

        this.ability = this.defineAbility();
    }

    //----------------------------------------------

    get(q: string) {
        for (let i = 0; i < this.permissions.length; i++) {
            let {id, name} = this.permissions[i];

            if (name === q || id.toString() === q) {
                return this.permissions[i];
            }
        }

        throw new Error('Sie verfügen nicht über diese Berechtigung.');
    }

    has(name: string) {
        if (this.permissions.length === 0) {
            return false;
        }

        try {
            this.get(name);
            return true;
        } catch (e) {
            return false;
        }
    }

    can(...args: any[]) {
        if (typeof this.ability === 'undefined') {
            return false;
        }

        return this.ability.can(...args);
    }

    getPower(name: string, strict: boolean | undefined) {
        strict = strict ?? false;

        if (strict) throw new Error('Sie haben keine gesetzte Berechtigunspower.');

        try {
            let permission = this.get(name);

            if (permission.hasOwnProperty('power') && permission.power !== null) {
                return permission.power;
            }
        } catch (e) {
            if (strict) {
                throw new Error('Sie haben keine gesetzte Inverse-Berechtigunspower.');
            }
        }

        return 0;
    }

    //----------------------------------------------
    // Ability
    //----------------------------------------------

    /**
     * Define casl ability by permission abilities.
     *
     * @return Promise<AuthAbility[]>
     */
    private defineAbility() {
        if (this.abilities.length === 0) {
            return new Ability();
        }

        const {can, rules} = new AbilityBuilder(Ability);

        for (let i = 0; i < this.abilities.length; i++) {
            let ability: AuthAbility = this.abilities[i];

            can(ability.action, ability.subject, ability.condition, ability.fields);
        }

        // @ts-ignore
        return new Ability(rules);
    }

    private static transformPermissionToAbility(permission: AbstractPermission) {
        let {name, scope} = permission;

        return transformScopeToAbility(name, scope);
    }

    private static transformPermissionsToAbilities(permissions: AbstractPermission[]) {
        let abilities: AuthAbility[] = [];

        for (let i = 0; i < permissions.length; i++) {
            let ability = PermissionManager.transformPermissionToAbility(permissions[i]);

            abilities.push(ability);
        }

        return abilities;
    }

    //----------------------------------------------
    // Permissions
    //----------------------------------------------
}

export default PermissionManager;
