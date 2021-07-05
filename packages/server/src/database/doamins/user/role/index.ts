import {EntitySchema} from "typeorm";
import {EntitySchemaOptions} from "typeorm/entity-schema/EntitySchemaOptions";

import {extendEntitySchemaOptions, getEntitySchemaIdColumnConfig, getEntitySchemaName} from "../../../schema";

import {RoleBaseInterface} from "../../role";
import {UserBaseInterface} from "../index";

export interface UserRoleBaseInterface {
    id: number | string;

    user_id: string | number;

    role_id: string | number;

    created_at: string;

    updated_at: string;

    role: RoleBaseInterface;

    user: UserBaseInterface;
}

// --------------------------------------

export function createUserRoleEntitySchemaOptions<T extends UserRoleBaseInterface>() : EntitySchemaOptions<T> {
    return {
        tableName: "user_roles",
        name: getEntitySchemaName('userRole'),
        columns: {
            id: getEntitySchemaIdColumnConfig('userRole'),
            role_id: {
                type: getEntitySchemaIdColumnConfig('role').type,
                unsigned: getEntitySchemaIdColumnConfig('role').unsigned
            },
            user_id: {
                type: getEntitySchemaIdColumnConfig('user').type,
                unsigned: getEntitySchemaIdColumnConfig('user').unsigned
            }
        },
        indices: [
            {name: 'roleUserIndex', unique: true, columns: ['role_id', 'user_id']}
        ],
        relations: {
            role: {type: "many-to-one", target: getEntitySchemaName('role'), joinColumn: {name: 'role_id'}, inverseSide: "user_roles"},
            user: {type: "many-to-one", target: getEntitySchemaName('user'), joinColumn: {name: 'user_id'}, inverseSide: "user_roles"}
        }
    }
}

export function createUserRoleEntitySchema<T extends UserRoleBaseInterface>(options?: Partial<EntitySchemaOptions<T>>) : EntitySchema<T> {
    const config = extendEntitySchemaOptions(createUserRoleEntitySchemaOptions<T>(), options);
    return new EntitySchema<T>(config);
}
