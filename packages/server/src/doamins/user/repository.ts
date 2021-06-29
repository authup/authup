import {Repository} from "typeorm";
import {OwnedPermission} from "@typescript-auth/core";
import {AbstractUser} from "./index";
import {AbstractRoleRepository} from "../role";

export abstract class AbstractAuthUserRepository<T extends AbstractUser> extends Repository<T> {
    async getOwnedPermissions(userId: number) : Promise<OwnedPermission<unknown>[]> {
        const entity = await this.findOne(userId, {relations: ['user_roles']});

        if(typeof entity === 'undefined') {
            return [];
        }

        const roleIds : string[] = entity.user_roles.map(userRole => userRole.role_id);

        if(roleIds.length === 0) {
            return [];
        }

        return await this.manager.getCustomRepository(AbstractRoleRepository)
            .getOwnedPermissions(roleIds);
    }
}
