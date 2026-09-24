/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationPermissionSpanish : NamespaceTranslations<`${PermissionName}`> = {
    [PermissionName.CLIENT_CREATE]: 'Crear clientes',
    [PermissionName.CLIENT_DELETE]: 'Eliminar clientes',
    [PermissionName.CLIENT_UPDATE]: 'Actualizar clientes',
    [PermissionName.CLIENT_READ]: 'Leer clientes',
    [PermissionName.CLIENT_SELF_MANAGE]: 'Gestionar el propio cliente',

    [PermissionName.CLIENT_PERMISSION_CREATE]: 'Asignar permisos de cliente',
    [PermissionName.CLIENT_PERMISSION_DELETE]: 'Quitar permisos de cliente',
    [PermissionName.CLIENT_PERMISSION_READ]: 'Leer permisos de cliente',
    [PermissionName.CLIENT_PERMISSION_UPDATE]: 'Actualizar permisos de cliente',

    [PermissionName.CLIENT_ROLE_CREATE]: 'Asignar roles de cliente',
    [PermissionName.CLIENT_ROLE_DELETE]: 'Quitar roles de cliente',
    [PermissionName.CLIENT_ROLE_UPDATE]: 'Actualizar roles de cliente',
    [PermissionName.CLIENT_ROLE_READ]: 'Leer roles de cliente',

    [PermissionName.CLIENT_SCOPE_CREATE]: 'Asignar ámbitos de cliente',
    [PermissionName.CLIENT_SCOPE_DELETE]: 'Quitar ámbitos de cliente',
    [PermissionName.CLIENT_SCOPE_READ]: 'Leer ámbitos de cliente',

    [PermissionName.CONSENT_READ]: 'Leer consentimientos',
    [PermissionName.CONSENT_DELETE]: 'Eliminar consentimientos',

    [PermissionName.EVENT_READ]: 'Leer eventos',

    [PermissionName.IDENTITY_PROVIDER_CREATE]: 'Crear proveedores de identidad',
    [PermissionName.IDENTITY_PROVIDER_DELETE]: 'Eliminar proveedores de identidad',
    [PermissionName.IDENTITY_PROVIDER_UPDATE]: 'Actualizar proveedores de identidad',
    [PermissionName.IDENTITY_PROVIDER_READ]: 'Leer proveedores de identidad',

    [PermissionName.IDENTITY_PROVIDER_ACCOUNT_READ]: 'Leer cuentas vinculadas',
    [PermissionName.IDENTITY_PROVIDER_ACCOUNT_DELETE]: 'Eliminar cuentas vinculadas',

    [PermissionName.IDENTITY_PROVIDER_ROLE_CREATE]: 'Asignar vinculaciones de roles de proveedor de identidad',
    [PermissionName.IDENTITY_PROVIDER_ROLE_DELETE]: 'Quitar vinculaciones de roles de proveedor de identidad',
    [PermissionName.IDENTITY_PROVIDER_ROLE_UPDATE]: 'Actualizar vinculaciones de roles de proveedor de identidad',
    [PermissionName.IDENTITY_PROVIDER_ROLE_READ]: 'Leer vinculaciones de roles de proveedor de identidad',

    [PermissionName.KEY_CREATE]: 'Crear claves',
    [PermissionName.KEY_DELETE]: 'Eliminar claves',
    [PermissionName.KEY_UPDATE]: 'Actualizar claves',
    [PermissionName.KEY_READ]: 'Leer claves',

    [PermissionName.PATH_CREATE]: 'Crear rutas',
    [PermissionName.PATH_DELETE]: 'Eliminar rutas',
    [PermissionName.PATH_UPDATE]: 'Actualizar rutas',
    [PermissionName.PATH_READ]: 'Leer rutas',

    [PermissionName.PERMISSION_CREATE]: 'Crear permisos',
    [PermissionName.PERMISSION_DELETE]: 'Eliminar permisos',
    [PermissionName.PERMISSION_UPDATE]: 'Actualizar permisos',
    [PermissionName.PERMISSION_READ]: 'Leer permisos',
    [PermissionName.PERMISSION_CHECK]: 'Comprobar permisos de otras identidades',

    [PermissionName.REALM_CREATE]: 'Crear dominios',
    [PermissionName.REALM_DELETE]: 'Eliminar dominios',
    [PermissionName.REALM_UPDATE]: 'Actualizar dominios',
    [PermissionName.REALM_READ]: 'Leer dominios',

    [PermissionName.ROLE_CREATE]: 'Crear roles',
    [PermissionName.ROLE_DELETE]: 'Eliminar roles',
    [PermissionName.ROLE_UPDATE]: 'Actualizar roles',
    [PermissionName.ROLE_READ]: 'Leer roles',

    [PermissionName.ROLE_PERMISSION_CREATE]: 'Asignar permisos de rol',
    [PermissionName.ROLE_PERMISSION_DELETE]: 'Quitar permisos de rol',
    [PermissionName.ROLE_PERMISSION_READ]: 'Leer permisos de rol',
    [PermissionName.ROLE_PERMISSION_UPDATE]: 'Actualizar permisos de rol',

    [PermissionName.SCOPE_CREATE]: 'Crear ámbitos',
    [PermissionName.SCOPE_DELETE]: 'Eliminar ámbitos',
    [PermissionName.SCOPE_UPDATE]: 'Actualizar ámbitos',
    [PermissionName.SCOPE_READ]: 'Leer ámbitos',

    [PermissionName.SESSION_READ]: 'Leer sesiones',
    [PermissionName.SESSION_DELETE]: 'Eliminar sesiones',

    [PermissionName.TOKEN_INTROSPECT]: 'Inspeccionar tokens',

    [PermissionName.USER_CREATE]: 'Crear usuarios',
    [PermissionName.USER_DELETE]: 'Eliminar usuarios',
    [PermissionName.USER_UPDATE]: 'Actualizar usuarios',
    [PermissionName.USER_READ]: 'Leer usuarios',
    [PermissionName.USER_SELF_MANAGE]: 'Gestionar la propia cuenta',

    [PermissionName.USER_AUTHENTICATOR_CREATE]: 'Crear autenticadores',
    [PermissionName.USER_AUTHENTICATOR_DELETE]: 'Eliminar autenticadores',
    [PermissionName.USER_AUTHENTICATOR_UPDATE]: 'Actualizar autenticadores',
    [PermissionName.USER_AUTHENTICATOR_READ]: 'Leer autenticadores',

    [PermissionName.USER_PERMISSION_CREATE]: 'Asignar permisos de usuario',
    [PermissionName.USER_PERMISSION_DELETE]: 'Quitar permisos de usuario',
    [PermissionName.USER_PERMISSION_READ]: 'Leer permisos de usuario',
    [PermissionName.USER_PERMISSION_UPDATE]: 'Actualizar permisos de usuario',

    [PermissionName.USER_ROLE_CREATE]: 'Asignar roles de usuario',
    [PermissionName.USER_ROLE_DELETE]: 'Quitar roles de usuario',
    [PermissionName.USER_ROLE_UPDATE]: 'Actualizar roles de usuario',
    [PermissionName.USER_ROLE_READ]: 'Leer roles de usuario',
};
