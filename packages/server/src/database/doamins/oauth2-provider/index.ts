import {EntitySchema} from "typeorm";
import {EntitySchemaOptions} from "typeorm/entity-schema/EntitySchemaOptions";

import {extendEntitySchemaOptions, getEntitySchemaIdColumnConfig, getEntitySchemaName} from "../../schema";

import {RealmBaseInterface} from "../realm";
import {OAuth2ProviderAccountBaseInterface} from "./account";

export interface OAuth2ProviderBaseInterface {
    id: number | string;

    name: string;

    open_id: boolean;

    client_id: string;

    client_secret: string | null;

    token_host: string;

    token_path: string | null;

    token_revoke_path: string | null;

    authorize_host: string | null;

    authorize_path: string | null;

    user_info_host: string | null;

    user_info_path: string | null;

    scope: string | null;

    created_at: Date;

    updated_at: Date;

    accounts: OAuth2ProviderAccountBaseInterface[];

    realm_id: string | number | null;

    realm: RealmBaseInterface | null;
}

// --------------------------------------

export function createOAuth2ProviderEntitySchemaOptions<T extends OAuth2ProviderBaseInterface>() : EntitySchemaOptions<T> {
    return {
        tableName: "oauth2_providers",
        name: getEntitySchemaName('oauth2Provider'),
        columns: {
            id: getEntitySchemaIdColumnConfig('oauth2Provider'),
            name: {type: "varchar", length: 128},
            open_id: {type: "boolean", default: false},
            client_id: {type: "varchar", length: 256},
            client_secret: {type: "varchar", length: 256, select: false},
            token_host: {type: "varchar", length: 256},
            token_path: {type: "varchar", length: 128, default: null, nullable: true},
            token_revoke_path: {type: "varchar", length: 128, default: null, nullable: true},
            authorize_host: {type: "varchar", length: 256, default: null, nullable: true},
            authorize_path: {type: "varchar", length: 128, default: null, nullable: true},
            user_info_host: {type: "varchar", length: 256, default: null, nullable: true},
            user_info_path: {type: "varchar", length: 128, default: null, nullable: true},
            created_at: { createDate: true, type: "timestamp"},
            updated_at: { updateDate: true, type: "timestamp"},
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
                inverseSide: 'oauth2_providers',
                joinColumn: {name: 'realm_id'},
                nullable: true,
                default: null,
                onDelete: "CASCADE"
            },
            accounts: {
                type: "one-to-many",
                target: getEntitySchemaName('oauth2ProviderAccount'),
                inverseSide: "provider"
            }
        }
    }
}

export function createOAuth2ProviderEntitySchema<T extends OAuth2ProviderBaseInterface>(options?: Partial<EntitySchemaOptions<T>>) : EntitySchema<T> {
    const config = extendEntitySchemaOptions<T>(createOAuth2ProviderEntitySchemaOptions<T>(), options);
    return new EntitySchema<T>(config);
}
