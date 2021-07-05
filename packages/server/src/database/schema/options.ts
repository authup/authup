import {EntitySchemaOptions} from "typeorm/entity-schema/EntitySchemaOptions";
import {EntitySchema} from "typeorm";

import {EntitySchemaType} from "./type";

import {createOAuth2ProviderEntitySchemaOptions} from "../doamins/oauth2-provider";
import {createOAuth2ProviderAccountEntitySchemaOptions} from "../doamins/oauth2-provider/account";
import {createPermissionEntitySchemaOptions} from "../doamins/permission";
import {createRealmEntitySchemaOptions} from "../doamins/realm";
import {createRoleEntitySchemaOptions} from "../doamins/role";
import {createRolePermissionEntitySchemaOptions} from "../doamins/role/permission";
import {createUserEntitySchemaOptions} from "../doamins/user";
import {createUserRoleEntitySchemaOptions} from "../doamins/user/role";
import {createUserPermissionEntitySchemaOptions} from "../doamins/user/permission";

export function extendEntitySchemaOptions<T>(
    options: EntitySchemaOptions<T>,
    additionalOptions?: Partial<EntitySchemaOptions<T>>
): EntitySchemaOptions<T> {
    if (typeof additionalOptions === 'undefined') {
        return options;
    }

    if (typeof additionalOptions.columns !== 'undefined') {
        options.columns = {
            ...options.columns,
            ...additionalOptions.columns
        }
    }

    if (typeof additionalOptions.relations !== 'undefined') {
        options.relations = {
            ...options.relations,
            ...additionalOptions.relations
        }
    }

    if (typeof additionalOptions.uniques !== 'undefined') {
        options.uniques = options.uniques ?? [];
        options.uniques = [...options.uniques, ...additionalOptions.uniques];
    }

    if (typeof additionalOptions.indices !== 'undefined') {
        options.indices = options.indices ?? [];
        options.indices = [...options.indices, ...additionalOptions.indices];
    }

    return options;
}

export function createEntitySchemaOptions(type: EntitySchemaType) {
    switch (type) {
        case "oauth2Provider":
            return createOAuth2ProviderEntitySchemaOptions();
        case "oauth2ProviderAccount":
            return createOAuth2ProviderAccountEntitySchemaOptions();
        case "permission":
            return createPermissionEntitySchemaOptions();
        case "realm":
            return createRealmEntitySchemaOptions();
        case "role":
            return createRoleEntitySchemaOptions();
        case "rolePermission":
            return createRolePermissionEntitySchemaOptions();
        case "user":
            return createUserEntitySchemaOptions();
        case "userPermission":
            return createUserPermissionEntitySchemaOptions();
        case "userRole":
            return createUserRoleEntitySchemaOptions();
    }
}

export function createEntitySchema<T>(type: EntitySchemaType, additionalOptions?: Partial<EntitySchemaOptions<T>>) {
    const config = extendEntitySchemaOptions(createEntitySchemaOptions(type), additionalOptions);

    return new EntitySchema<T>(config);
}
