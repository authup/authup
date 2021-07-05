import {EntitySchema} from "typeorm";
import {EntitySchemaOptions} from "typeorm/entity-schema/EntitySchemaOptions";

import {extendEntitySchemaOptions, getEntitySchemaIdColumnConfig, getEntitySchemaName} from "../../schema";

import {UserBaseInterface} from "../user";
import {RoleBaseInterface} from "../role";
import {OAuth2ProviderBaseInterface} from "../oauth2-provider";


export interface RealmBaseInterface {
    id: string | number;

    oauth2_providers: OAuth2ProviderBaseInterface[];

    users: UserBaseInterface[];

    roles: RoleBaseInterface[];
}

// --------------------------------------

export function createRealmEntitySchemaOptions<T extends RealmBaseInterface>() : EntitySchemaOptions<T> {
    return {
        tableName: "realms",
        name: getEntitySchemaName('realm'),
        columns: {
            id: getEntitySchemaIdColumnConfig('realm')
        },
        relations: {
            oauth2_providers: {
                type: "one-to-many",
                target: getEntitySchemaName('oauth2Provider'),
                inverseSide: "realm"
            },
            users: {
                type: "one-to-many",
                target: getEntitySchemaName('user'),
                inverseSide: "realm"
            },
            roles: {
                type: "one-to-many",
                target: getEntitySchemaName('role'),
                inverseSide: "realm"
            }
        }
    }
}

export function createRealmEntitySchema<T extends RealmBaseInterface>(options?: Partial<EntitySchemaOptions<T>>) : EntitySchema<T> {
    const config = extendEntitySchemaOptions<T>(createRealmEntitySchemaOptions<T>(), options);
    return new EntitySchema<T>(config);
}

