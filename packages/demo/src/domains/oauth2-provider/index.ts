import {
    createEntitySchemaOptions,
    extendEntitySchemaOptions,
    OAuth2ProviderBaseInterface,
} from "@typescript-auth/server";
import {EntitySchema} from "typeorm";

export interface ProviderInterface extends OAuth2ProviderBaseInterface {

}

const config = extendEntitySchemaOptions<ProviderInterface>(createEntitySchemaOptions('oauth2Provider'), {});

export const Provider = new EntitySchema<ProviderInterface>(config);
