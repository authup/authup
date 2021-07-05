import {EntityManager, In} from "typeorm";
import {OwnedPermission} from "@typescript-auth/core";
import {
    getEntitySchemaName,
    RolePermissionBaseInterface,
    UserBaseInterface,
    UserPermissionBaseInterface
} from "@typescript-auth/server";

type PermissionOptions = {
    selfOwned?: boolean,
    roleOwned?: boolean
}

export class TestPermissionHandler {
    constructor(protected manager: EntityManager) {

    }

    async getUserOwnedPermissions(userId: string | number, options?: PermissionOptions) : Promise<OwnedPermission<unknown>[]> {
        options = options ?? {};
        options.selfOwned = options.selfOwned ?? true;
        options.roleOwned = options.roleOwned ?? true;

        let permissions : OwnedPermission<unknown>[] = [];

        if(options.selfOwned) {
            permissions = [...await this.getUserSelfOwnedPermissions(userId)];
        }

        if(options.roleOwned) {
            const entity = await this.manager
                .getRepository<UserBaseInterface>(getEntitySchemaName('user'))
                .findOne(userId, {relations: ['user_roles']});

            if (typeof entity === 'undefined') {
                return permissions;
            }

            const roleIds: (string | number)[] = entity.user_roles.map(userRole => userRole.role_id);

            if (roleIds.length === 0) {
                return permissions;
            }

            permissions = [...permissions, ...await this.getRoleOwnedPermissions(roleIds)];
        }

        return permissions;
    }

    async getUserSelfOwnedPermissions(userId: string | number) : Promise<OwnedPermission<unknown>[]> {
        const repository = this.manager.getRepository<UserPermissionBaseInterface>(getEntitySchemaName('userPermission'));
        const entities = await repository.find({
            user_id: userId
        });

        const result : OwnedPermission<unknown>[] = [];
        for(let i=0; i<entities.length; i++) {
            result.push({
                id: entities[i].permission_id,
                condition: entities[i].condition,
                power: entities[i].power,
                fields: entities[i].fields,
                negation: entities[i].negation
            })
        }

        return result;
    }

    // -------------------------------------------------------------------------------------------

    async getRoleOwnedPermissions(
        roleId: string | number | (string | number)[]
    ) : Promise<OwnedPermission<unknown>[]> {
        if(!Array.isArray(roleId)) {
            roleId = [roleId];
        }

        if(roleId.length === 0) {
            return [];
        }

        const repository = this.manager
            .getRepository<RolePermissionBaseInterface>(getEntitySchemaName('rolePermission'));

        const entities = await repository.find({
            role_id: In(roleId)
        });

        const result : OwnedPermission<unknown>[] = [];
        for(let i=0; i<entities.length; i++) {
            result.push({
                id: entities[i].permission_id,
                condition: entities[i].condition,
                power: entities[i].power,
                fields: entities[i].fields,
                negation: entities[i].negation
            })
        }

        return result;
    }
}
