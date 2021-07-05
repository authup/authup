import {
    createEntitySchemaOptions,
    extendEntitySchemaOptions,
    RolePermissionBaseInterface
} from "@typescript-auth/server";
import {EntitySchema} from "typeorm";

export interface RolePermissionInterface extends RolePermissionBaseInterface {

}

const config = extendEntitySchemaOptions(createEntitySchemaOptions('rolePermission'), {});
export const RolePermission = new EntitySchema<RolePermissionInterface>(config);
