import {EntitySchema} from "typeorm";
import {EntitySchemaOptions} from "typeorm/entity-schema/EntitySchemaOptions";

import {extendEntitySchemaOptions, getEntitySchemaName} from "../../schema";

import {UserPermissionBaseInterface} from "../user/permission";
import {RolePermissionBaseInterface} from "../role/permission";

export interface PermissionBaseInterface {
    id: string;

    created_at: string;

    updated_at: string;

    role_permissions: RolePermissionBaseInterface[];

    user_permissions: UserPermissionBaseInterface[];
}

// --------------------------------------

export function createPermissionEntitySchemaOptions<T extends PermissionBaseInterface>() : EntitySchemaOptions<T> {
    return {
        tableName: "permissions",
        name: getEntitySchemaName('permission'),
        columns: {
            id: {type: "varchar", primary: true, length: 100},

            created_at: {createDate: true, type: "timestamp"},
            updated_at: {updateDate: true, type: "timestamp"}
        },
        relations: {
            role_permissions: {type: "one-to-many", target: getEntitySchemaName('rolePermission'), inverseSide: "permission"},
            user_permissions: {type: "one-to-many", target: getEntitySchemaName('userPermission'), inverseSide: "permission"}
        }
    }
}

export function createPermissionEntitySchema<T extends PermissionBaseInterface>(options?: Partial<EntitySchemaOptions<T>>) : EntitySchema<T> {
    const config = extendEntitySchemaOptions<T>(createPermissionEntitySchemaOptions<T>(), options);
    return new EntitySchema<T>(config);
}
