import {EntitySchema} from "typeorm";
import {EntitySchemaOptions} from "typeorm/entity-schema/EntitySchemaOptions";

import {extendEntitySchemaOptions, getEntitySchemaIdColumnConfig, getEntitySchemaName} from "../../schema";

import {UserRoleBaseInterface} from "./role";
import {UserPermissionBaseInterface} from "./permission";
import {OAuth2ProviderAccountBaseInterface} from "../oauth2-provider/account";
import {RealmBaseInterface} from "../realm";

export interface UserBaseInterface {
    id: string | number;

    realm_id: string | number | null;

    realm: RealmBaseInterface | null;

    user_roles: UserRoleBaseInterface[];

    user_permissions: UserPermissionBaseInterface[];

    oauth2_provider_accounts: OAuth2ProviderAccountBaseInterface[],
}

// --------------------------------------

export function createUserEntitySchemaOptions<T extends UserBaseInterface>() : EntitySchemaOptions<T> {
    return {
        tableName: "users",
        name: getEntitySchemaName('user'),
        columns: {
            id: getEntitySchemaIdColumnConfig('user'),
            realm_id: {
                type: getEntitySchemaIdColumnConfig('realm').type,
                unsigned: getEntitySchemaIdColumnConfig('realm').unsigned,
                nullable: true,
                default: null
            }
        },
        relations: {
            realm: {
                type: "many-to-one",
                target: getEntitySchemaName('realm'),
                inverseSide: 'users',
                joinColumn: {name: 'realm_id'},
                nullable: true,
                default: null,
                onDelete: "CASCADE"
            },
            user_roles: {
                type: "one-to-many",
                target: getEntitySchemaName('userRole'),
                inverseSide: "user"
            },
            user_permissions: {
                type: "one-to-many",
                target: getEntitySchemaName('userPermission'),
                inverseSide: "user"
            },
            oauth2_provider_accounts: {
                type: "one-to-many",
                target: getEntitySchemaName('oauth2ProviderAccount'),
                inverseSide: "user"
            }
        }
    }
}

export function createUserEntitySchema<T extends UserBaseInterface>(options?: Partial<EntitySchemaOptions<T>>) : EntitySchema<T> {
    const config = extendEntitySchemaOptions<T>(createUserEntitySchemaOptions<T>(), options);
    return new EntitySchema<T>(config);
}

