/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationPermissionGerman : NamespaceTranslations<`${PermissionName}`> = {
    [PermissionName.CLIENT_CREATE]: 'Clients erstellen',
    [PermissionName.CLIENT_DELETE]: 'Clients löschen',
    [PermissionName.CLIENT_UPDATE]: 'Clients bearbeiten',
    [PermissionName.CLIENT_READ]: 'Clients lesen',
    [PermissionName.CLIENT_SELF_MANAGE]: 'Eigenen Client verwalten',

    [PermissionName.CLIENT_PERMISSION_CREATE]: 'Client-Berechtigungen zuweisen',
    [PermissionName.CLIENT_PERMISSION_DELETE]: 'Client-Berechtigungen entfernen',
    [PermissionName.CLIENT_PERMISSION_READ]: 'Client-Berechtigungen lesen',
    [PermissionName.CLIENT_PERMISSION_UPDATE]: 'Client-Berechtigungen bearbeiten',

    [PermissionName.CLIENT_ROLE_CREATE]: 'Client-Rollen zuweisen',
    [PermissionName.CLIENT_ROLE_DELETE]: 'Client-Rollen entfernen',
    [PermissionName.CLIENT_ROLE_UPDATE]: 'Client-Rollen bearbeiten',
    [PermissionName.CLIENT_ROLE_READ]: 'Client-Rollen lesen',

    [PermissionName.CLIENT_SCOPE_CREATE]: 'Client-Bereiche zuweisen',
    [PermissionName.CLIENT_SCOPE_DELETE]: 'Client-Bereiche entfernen',
    [PermissionName.CLIENT_SCOPE_READ]: 'Client-Bereiche lesen',

    [PermissionName.CONSENT_READ]: 'Einwilligungen lesen',
    [PermissionName.CONSENT_DELETE]: 'Einwilligungen löschen',

    [PermissionName.EVENT_READ]: 'Ereignisse lesen',

    [PermissionName.IDENTITY_PROVIDER_CREATE]: 'Identitätsanbieter erstellen',
    [PermissionName.IDENTITY_PROVIDER_DELETE]: 'Identitätsanbieter löschen',
    [PermissionName.IDENTITY_PROVIDER_UPDATE]: 'Identitätsanbieter bearbeiten',
    [PermissionName.IDENTITY_PROVIDER_READ]: 'Identitätsanbieter lesen',

    [PermissionName.IDENTITY_PROVIDER_ACCOUNT_READ]: 'Verknüpfte Konten lesen',
    [PermissionName.IDENTITY_PROVIDER_ACCOUNT_DELETE]: 'Verknüpfte Konten löschen',

    [PermissionName.IDENTITY_PROVIDER_ROLE_CREATE]: 'Rollenzuordnungen von Identitätsanbietern zuweisen',
    [PermissionName.IDENTITY_PROVIDER_ROLE_DELETE]: 'Rollenzuordnungen von Identitätsanbietern entfernen',
    [PermissionName.IDENTITY_PROVIDER_ROLE_UPDATE]: 'Rollenzuordnungen von Identitätsanbietern bearbeiten',
    [PermissionName.IDENTITY_PROVIDER_ROLE_READ]: 'Rollenzuordnungen von Identitätsanbietern lesen',

    [PermissionName.KEY_CREATE]: 'Schlüssel und vertrauenswürdige CAs erstellen',
    [PermissionName.KEY_DELETE]: 'Schlüssel und vertrauenswürdige CAs löschen',
    [PermissionName.KEY_UPDATE]: 'Schlüssel und vertrauenswürdige CAs bearbeiten',
    [PermissionName.KEY_READ]: 'Schlüssel und vertrauenswürdige CAs lesen',

    [PermissionName.PATH_CREATE]: 'Pfade erstellen',
    [PermissionName.PATH_DELETE]: 'Pfade löschen',
    [PermissionName.PATH_UPDATE]: 'Pfade bearbeiten',
    [PermissionName.PATH_READ]: 'Pfade lesen',

    [PermissionName.PERMISSION_CREATE]: 'Berechtigungen erstellen',
    [PermissionName.PERMISSION_DELETE]: 'Berechtigungen löschen',
    [PermissionName.PERMISSION_UPDATE]: 'Berechtigungen bearbeiten',
    [PermissionName.PERMISSION_READ]: 'Berechtigungen lesen',
    [PermissionName.PERMISSION_CHECK]: 'Berechtigungen anderer Identitäten prüfen',

    [PermissionName.REALM_CREATE]: 'Organisationen erstellen',
    [PermissionName.REALM_DELETE]: 'Organisationen löschen',
    [PermissionName.REALM_UPDATE]: 'Organisationen bearbeiten',
    [PermissionName.REALM_READ]: 'Organisationen lesen',

    [PermissionName.ROLE_CREATE]: 'Rollen erstellen',
    [PermissionName.ROLE_DELETE]: 'Rollen löschen',
    [PermissionName.ROLE_UPDATE]: 'Rollen bearbeiten',
    [PermissionName.ROLE_READ]: 'Rollen lesen',

    [PermissionName.ROLE_PERMISSION_CREATE]: 'Rollen-Berechtigungen zuweisen',
    [PermissionName.ROLE_PERMISSION_DELETE]: 'Rollen-Berechtigungen entfernen',
    [PermissionName.ROLE_PERMISSION_READ]: 'Rollen-Berechtigungen lesen',
    [PermissionName.ROLE_PERMISSION_UPDATE]: 'Rollen-Berechtigungen bearbeiten',

    [PermissionName.SCOPE_CREATE]: 'Bereiche erstellen',
    [PermissionName.SCOPE_DELETE]: 'Bereiche löschen',
    [PermissionName.SCOPE_UPDATE]: 'Bereiche bearbeiten',
    [PermissionName.SCOPE_READ]: 'Bereiche lesen',

    [PermissionName.SESSION_READ]: 'Sitzungen lesen',
    [PermissionName.SESSION_DELETE]: 'Sitzungen löschen',

    [PermissionName.TOKEN_INTROSPECT]: 'Tokens prüfen',

    [PermissionName.USER_CREATE]: 'Benutzer erstellen',
    [PermissionName.USER_DELETE]: 'Benutzer löschen',
    [PermissionName.USER_UPDATE]: 'Benutzer bearbeiten',
    [PermissionName.USER_READ]: 'Benutzer lesen',
    [PermissionName.USER_SELF_MANAGE]: 'Eigenes Konto verwalten',

    [PermissionName.USER_AUTHENTICATOR_CREATE]: 'Authentifikatoren erstellen',
    [PermissionName.USER_AUTHENTICATOR_DELETE]: 'Authentifikatoren löschen',
    [PermissionName.USER_AUTHENTICATOR_UPDATE]: 'Authentifikatoren bearbeiten',
    [PermissionName.USER_AUTHENTICATOR_READ]: 'Authentifikatoren lesen',

    [PermissionName.USER_PERMISSION_CREATE]: 'Benutzer-Berechtigungen zuweisen',
    [PermissionName.USER_PERMISSION_DELETE]: 'Benutzer-Berechtigungen entfernen',
    [PermissionName.USER_PERMISSION_READ]: 'Benutzer-Berechtigungen lesen',
    [PermissionName.USER_PERMISSION_UPDATE]: 'Benutzer-Berechtigungen bearbeiten',

    [PermissionName.USER_ROLE_CREATE]: 'Benutzer-Rollen zuweisen',
    [PermissionName.USER_ROLE_DELETE]: 'Benutzer-Rollen entfernen',
    [PermissionName.USER_ROLE_UPDATE]: 'Benutzer-Rollen bearbeiten',
    [PermissionName.USER_ROLE_READ]: 'Benutzer-Rollen lesen',
};
