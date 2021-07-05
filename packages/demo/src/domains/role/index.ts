import {
    createEntitySchemaOptions,
    extendEntitySchemaOptions,
    RoleBaseInterface
} from "@typescript-auth/server";
import {EntitySchema} from "typeorm";

export interface RoleInterface extends RoleBaseInterface {
    name: string
}

const config = extendEntitySchemaOptions<RoleInterface>(createEntitySchemaOptions('role'), {
    columns: {
        name: {type: "varchar", length: 100}
    }
});

export const Role = new EntitySchema<RoleInterface>(config)
