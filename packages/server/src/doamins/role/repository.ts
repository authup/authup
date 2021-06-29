import {In, ObjectLiteral, Repository} from "typeorm";
import {OwnedPermission} from "../../permission/type";
import {RolePermission} from "./permission";

export abstract class AbstractRoleRepository<
    T extends ObjectLiteral
> extends Repository<T> {
    async getOwnedPermissions(
        roleId: string | string[]
    ) : Promise<OwnedPermission[]> {
        if(!Array.isArray(roleId)) {
            roleId = [roleId];
        }

        if(roleId.length === 0) {
            return [];
        }

        const repository = this.manager.getRepository(RolePermission);
        const entities = await repository.find({
            role_id: In(roleId)
        });

        const result : OwnedPermission[] = [];
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

