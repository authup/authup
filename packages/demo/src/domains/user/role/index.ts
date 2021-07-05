import {
    createEntitySchemaOptions,
    extendEntitySchemaOptions,
    UserRoleBaseInterface
} from "@typescript-auth/server";
import {EntitySchema} from "typeorm";

export interface UserRoleInterface extends UserRoleBaseInterface {

}

const config = extendEntitySchemaOptions(createEntitySchemaOptions('userRole'), {});
export const UserRole = new EntitySchema<UserRoleInterface>(config);
