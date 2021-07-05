import {EntitySchemaType} from "./type";

const entitySchemaNames: Record<EntitySchemaType, string> = {
    permission: 'permission',
    oauth2Provider: 'provider',
    oauth2ProviderAccount: 'provider_account',
    realm: 'realm',
    role: 'role',
    rolePermission: 'role_permission',
    user: 'user',
    userPermission: 'user_permission',
    userRole: 'user_role'
}

export function setEntitySchemaNames(data: Partial<Record<EntitySchemaType, string>>) {
    for (const key in data) {
        if (!data[key as EntitySchemaType]) continue;

        entitySchemaNames[key as EntitySchemaType] = data[key as EntitySchemaType];
    }
}

export function setEntitySchemaName(type: EntitySchemaType, value: string) {
    entitySchemaNames[type] = value;
}

export function getEntitySchemaName(type: EntitySchemaType) {
    return entitySchemaNames[type];
}
