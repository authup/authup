import {
    createEntitySchemaOptions,
    extendEntitySchemaOptions,
    OAuth2ProviderAccountBaseInterface,
} from "@typescript-auth/server";
import {EntitySchema} from "typeorm";

export interface ProviderAccountInterface extends OAuth2ProviderAccountBaseInterface {

}

const config = extendEntitySchemaOptions<ProviderAccountInterface>(createEntitySchemaOptions('oauth2ProviderAccount'), {});

export const ProviderAccount = new EntitySchema<ProviderAccountInterface>(config);
