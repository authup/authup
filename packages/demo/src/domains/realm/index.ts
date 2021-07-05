import {
    createEntitySchemaOptions,
    extendEntitySchemaOptions,
    RealmBaseInterface
} from "@typescript-auth/server";
import {EntitySchema} from "typeorm";

export interface RealmInterface extends RealmBaseInterface {
    name: string
}

const config = extendEntitySchemaOptions<RealmInterface>(createEntitySchemaOptions('realm'), {
    columns: {
        name: {type: "varchar", length: 100}
    }
});

export const Realm = new EntitySchema<RealmInterface>(config);
