import {EntitySchema} from "typeorm";
import {EntitySchemaOptions} from "typeorm/entity-schema/EntitySchemaOptions";

import {extendEntitySchemaOptions, getEntitySchemaIdColumnConfig, getEntitySchemaName} from "../../schema";

import {RealmBaseInterface} from "../realm";
import {RolePermissionBaseInterface} from "./permission";
import {UserRoleBaseInterface} from "../user/role";

export interface RoleBaseInterface {
    id: string | number,

    realm_id: string | number | null;

    realm: RealmBaseInterface | null;

    user_roles: UserRoleBaseInterface[]

    role_permissions: RolePermissionBaseInterface[]
}

// --------------------------------------

export function createRoleEntitySchemaOptions<T extends RoleBaseInterface>() : EntitySchemaOptions<T> {
    return {
        tableName: "roles",
        name: getEntitySchemaName('role'),
        columns: {
            id: getEntitySchemaIdColumnConfig('role'),
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
                inverseSide: 'roles',
                joinColumn: {name: 'realm_id'},
                nullable: true,
                default: null,
                onDelete: "CASCADE"
            },
            user_roles: {
                type: "one-to-many",
                target: getEntitySchemaName('userRole'),
                inverseSide: "role"
            },
            role_permissions: {
                type: "one-to-many",
                target: getEntitySchemaName('rolePermission'),
                inverseSide: "role"
            }
        }
    }
}

export function createRoleEntitySchema<T extends RoleBaseInterface>(options?: Partial<EntitySchemaOptions<T>>) : EntitySchema<T> {
    const config = extendEntitySchemaOptions(createRoleEntitySchemaOptions<T>(), options);
    return new EntitySchema<T>(config);
}

