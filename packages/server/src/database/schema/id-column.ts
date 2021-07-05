import {EntitySchemaIdColumnConfig, EntitySchemaIdType} from "./type";
import {ColumnType} from "typeorm";
import {hasOwnProperty} from "@typescript-auth/core/dist/utils";

const entitySchemaIdColumnConfig: Record<EntitySchemaIdType, EntitySchemaIdColumnConfig> = {
    oauth2Provider: {type: "uuid", generated: "uuid"},
    oauth2ProviderAccount: {type: "int", generated: "increment", unsigned: true},
    realm: {type: "varchar", length: 36},
    role: {type: "int", generated: "increment", unsigned: true},
    rolePermission: {type: "int", generated: "increment", unsigned: true},
    user: {type: "int", generated: "increment", unsigned: true},
    userRole: {type: "int", generated: "increment", unsigned: true},
    userPermission: {type: "int", generated: "increment", unsigned: true}
}

export function setEntitySchemasIdColumnConfig(
    data: Partial<Record<EntitySchemaIdType, EntitySchemaIdColumnConfig>>
) {
    for (const key in data) {
        if (!data[key as EntitySchemaIdType]) continue;

        setEntitySchemaIdColumnConfig(key as EntitySchemaIdType, data[key as EntitySchemaIdType]);
    }
}

export function setEntitySchemaIdColumnConfig(
    type: EntitySchemaIdType,
    value: ColumnType | EntitySchemaIdColumnConfig
) {
    if (!hasOwnProperty(value, 'type')) {
        value = {
            type: value,
            generated: undefined
        };

        if (value.type.toString().includes('int')) {
            value.generated = "increment";
            value.unsigned = true;
        }

        if (value.type.toString().includes('uuid')) {
            value.generated = "uuid";
        }
    }

    value.primary = true;

    entitySchemaIdColumnConfig[type] = value;
}

export function getEntitySchemaIdColumnConfig(type: EntitySchemaIdType) {
    return {primary: true, ...entitySchemaIdColumnConfig[type]};
}
