import {
    createEntitySchemaOptions,
    extendEntitySchemaOptions,
    UserPermissionBaseInterface
} from "@typescript-auth/server";
import {EntitySchema} from "typeorm";

export interface UserPermissionInterface extends UserPermissionBaseInterface {

}

const config = extendEntitySchemaOptions(createEntitySchemaOptions('userPermission'), {});
export const UserPermission = new EntitySchema<UserPermissionInterface>(config);
