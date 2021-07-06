import {EntitySchema} from "typeorm";
import {EntitySchemaOptions} from "typeorm/entity-schema/EntitySchemaOptions";

import {extendEntitySchemaOptions, getEntitySchemaIdColumnConfig, getEntitySchemaName} from "../../../schema";

import {OAuth2ProviderBaseInterface} from "../index";
import {UserBaseInterface} from "../../user";

export interface OAuth2ProviderAccountBaseInterface {
    id: number | string;

    created_at: Date;

    updated_at: Date;

    access_token: string | null;

    refresh_token: string | null;

    expires_in: number | null;

    expires_at: Date | null;

    provider_user_id: string | number;

    provider_user_name: string | null;

    provider_user_email: string | null;

    // --------------------------------------

    user_id: string | number;

    user: UserBaseInterface;

    provider_id: string;

    provider: OAuth2ProviderBaseInterface;
}

// --------------------------------------

export function createOAuth2ProviderAccountEntitySchemaOptions<T extends OAuth2ProviderAccountBaseInterface>() : EntitySchemaOptions<T> {
    return {
        tableName: "oauth2_provider_accounts",
        name: getEntitySchemaName('oauth2ProviderAccount'),
        columns: {
            id: getEntitySchemaIdColumnConfig('oauth2ProviderAccount'),
            created_at: { createDate: true, type: "timestamp"},
            updated_at: { updateDate: true, type: "timestamp"},
            access_token: { type: "text", nullable: true, default: null},
            refresh_token: { type: "text", nullable: true, default: null},
            expires_in: {type: "int", unsigned: true, nullable: true, default: null},
            expires_at: {type: "timestamp", nullable: true, default: null},
            provider_user_id: {type: "varchar", length: 256},
            provider_user_name: {type: "varchar", length: 256, nullable: true, default: null},
            provider_user_email: {type: "varchar", length: 512, nullable: true, default: null},
            user_id: {
                type: getEntitySchemaIdColumnConfig('user').type,
                unsigned: getEntitySchemaIdColumnConfig('user').unsigned
            },
            provider_id: {
                type: getEntitySchemaIdColumnConfig('oauth2Provider').type,
                unsigned: getEntitySchemaIdColumnConfig('oauth2Provider').unsigned
            },
        },
        indices: [
            { name: "providerIdProviderUserId", columns: ['provider_id', 'provider_user_id']}
        ],
        relations: {
            provider: {
                type: "many-to-one",
                target: getEntitySchemaName('oauth2Provider'),
                joinColumn: {name: 'provider_id'},
                inverseSide: "accounts",
                onDelete: "CASCADE"
            },
            user: {
                type: "many-to-one",
                target: getEntitySchemaName('user'),
                joinColumn: {name: 'user_id'},
                inverseSide: "oauth2_provider_accounts",
                onDelete: "CASCADE"
            }
        }
    }
}

export function createOAuth2ProviderAccountEntitySchema<T extends OAuth2ProviderAccountBaseInterface>(options?: Partial<EntitySchemaOptions<T>>) : EntitySchema<T> {
    const config = extendEntitySchemaOptions<T>(createOAuth2ProviderAccountEntitySchemaOptions<T>(), options);
    return new EntitySchema<T>(config);
}
