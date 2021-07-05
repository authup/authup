import {
    createEntitySchemaOptions,
    extendEntitySchemaOptions,
    PermissionBaseInterface
} from "@typescript-auth/server";
import {EntitySchema} from "typeorm";

export interface PermissionInterface extends PermissionBaseInterface {

}

const config = extendEntitySchemaOptions<PermissionInterface>(createEntitySchemaOptions('permission'), {});

export const Permission = new EntitySchema<PermissionInterface>(config);
