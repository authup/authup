import {ColumnType, EntitySchemaColumnOptions} from "typeorm";

export type EntitySchemaType =
    'oauth2Provider' |
    'oauth2ProviderAccount' |
    'permission' |
    'realm' |
    'role' |
    'rolePermission' |
    'user' |
    'userPermission' |
    'userRole';

/**
 * Allow changing primary key config, for any entity expect of permission.
 */
export type EntitySchemaIdType = Exclude<EntitySchemaType, 'permission'>;

export type EntitySchemaIdColumnConfig = {
    type: ColumnType,
    primary?: EntitySchemaColumnOptions['primary'],
    length?: EntitySchemaColumnOptions['length'],
    unsigned?: EntitySchemaColumnOptions['unsigned'],
    generated?: EntitySchemaColumnOptions['generated']
};
