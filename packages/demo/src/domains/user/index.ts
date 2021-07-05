import {
    createEntitySchemaOptions,
    extendEntitySchemaOptions, UserBaseInterface
} from "@typescript-auth/server";
import {EntitySchema} from "typeorm";

export interface UserInterface extends UserBaseInterface {
    name: string
}

const config = extendEntitySchemaOptions<UserInterface>(createEntitySchemaOptions('user'), {
    columns: {
        name: {type: "varchar", length: 100}
    }
});

export const User = new EntitySchema<UserInterface>(config);
