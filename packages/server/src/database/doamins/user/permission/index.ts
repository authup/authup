import {
    EntitySchema,
} from "typeorm";
import {EntitySchemaOptions} from "typeorm/entity-schema/EntitySchemaOptions";

import {extendEntitySchemaOptions, getEntitySchemaIdColumnConfig, getEntitySchemaName} from "../../../schema";

import {PermissionBaseInterface} from "../../permission";
import {PermissionRelationInterface, PermissionRelationColumns} from "../../permission/relation";
import {UserBaseInterface} from "../index";


export interface UserPermissionBaseInterface extends PermissionRelationInterface {
    id: number | string;

    user_id: string | number;

    permission_id: string;

    user: UserBaseInterface;

    permission: PermissionBaseInterface;
}

// --------------------------------------

export function createUserPermissionEntitySchemaOptions<T extends UserPermissionBaseInterface>() : EntitySchemaOptions<T> {
    return {
        tableName: "user_permissions",
        name: getEntitySchemaName('userPermission'),
        columns: {
            id: getEntitySchemaIdColumnConfig('userPermission'),
            user_id: {
                type: getEntitySchemaIdColumnConfig('user').type,
                unsigned: getEntitySchemaIdColumnConfig('user').unsigned
            },
            permission_id: {type: "varchar", length: 100},
            ...PermissionRelationColumns
        },
        indices: [
            {name: 'userPermissionIndex', unique: true, columns: ['user_id', 'permission_id']}
        ],
        relations: {
            user: {type: "many-to-one", target: getEntitySchemaName('user'), joinColumn: {name: 'user_id'}, inverseSide: "user_permissions"},
            permission: {type: "many-to-one", target: getEntitySchemaName('permission'), joinColumn: {name: 'permission_id'}, inverseSide: "user_permissions"}
        }
    }
}

export function createUserPermissionEntitySchema<T extends UserPermissionBaseInterface>(options?: Partial<EntitySchemaOptions<T>>) : EntitySchema<T> {
    const config = extendEntitySchemaOptions<T>(createUserPermissionEntitySchemaOptions<T>(), options);
    return new EntitySchema<T>(config);
}
