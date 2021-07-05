import {
    EntitySchema,
} from "typeorm";
import {EntitySchemaOptions} from "typeorm/entity-schema/EntitySchemaOptions";

import {extendEntitySchemaOptions, getEntitySchemaIdColumnConfig, getEntitySchemaName} from "../../../schema";

import {PermissionBaseInterface} from "../../permission";
import {PermissionRelationInterface, PermissionRelationColumns} from "../../permission/relation";
import {RoleBaseInterface} from "../index";



export interface RolePermissionBaseInterface extends PermissionRelationInterface {
    id: number | string;

    permission_id: string;

    role_id: string | number;

    role: RoleBaseInterface;

    permission: PermissionBaseInterface;
}

// --------------------------------------

export function createRolePermissionEntitySchemaOptions<T extends RolePermissionBaseInterface>() : EntitySchemaOptions<T> {
    return {
        tableName: "role_permissions",
        name: getEntitySchemaName('rolePermission'),
        columns: {
            id: getEntitySchemaIdColumnConfig('rolePermission'),
            role_id: {
                type: getEntitySchemaIdColumnConfig('role').type,
                unsigned: getEntitySchemaIdColumnConfig('role').unsigned
            },
            permission_id: {type: "varchar"},
            ...PermissionRelationColumns
        },
        indices: [
            {name: 'rolePermissionIndex', unique: true, columns: ['role_id', 'permission_id']}
        ],
        relations: {
            role: {type: "many-to-one", target: getEntitySchemaName('role'), joinColumn: {name: 'role_id'}, inverseSide: "role_permissions"},
            permission: {type: "many-to-one", target: getEntitySchemaName('permission'), joinColumn: {name: 'permission_id'}, inverseSide: "role_permissions"}
        }
    }
}

export function createRolePermissionEntitySchema<T extends RolePermissionBaseInterface>(options?: Partial<EntitySchemaOptions<T>>) : EntitySchema<T> {
    const config = extendEntitySchemaOptions(createRolePermissionEntitySchemaOptions<T>(), options);
    return new EntitySchema<T>(config);
}
