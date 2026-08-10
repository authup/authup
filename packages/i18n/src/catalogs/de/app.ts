/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationAppKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationAppGerman : NamespaceTranslations<`${TranslatorTranslationAppKey}`> = {
    [TranslatorTranslationAppKey.HOME]: 'Startseite',
    [TranslatorTranslationAppKey.RESOURCES]: 'Ressourcen',
    [TranslatorTranslationAppKey.GENERAL]: 'Allgemein',
    [TranslatorTranslationAppKey.OTHER]: 'Sonstiges',
    [TranslatorTranslationAppKey.SETTINGS]: 'Einstellungen',
    [TranslatorTranslationAppKey.LOGOUT]: 'Abmelden',
    [TranslatorTranslationAppKey.ACCOUNT]: 'Konto',
    [TranslatorTranslationAppKey.MANAGE_ACCOUNT]: 'Konto verwalten',
    [TranslatorTranslationAppKey.SECURITY]: 'Sicherheit',

    [TranslatorTranslationAppKey.MANAGEMENT]: 'Verwaltung',
    [TranslatorTranslationAppKey.DETAILS]: 'Details',
    [TranslatorTranslationAppKey.SET_MANAGEMENT_REALM]: 'Als Verwaltungs-Realm festlegen',
    [TranslatorTranslationAppKey.API_DOCS]: 'API-Dokumentation',
    [TranslatorTranslationAppKey.MADE_WITH]: 'Erstellt mit',

    [TranslatorTranslationAppKey.LOGIN_TITLE]: 'Anmelden',
    [TranslatorTranslationAppKey.LOGIN_SUBTITLE]: 'Wähle einen Realm aus, um fortzufahren',

    [TranslatorTranslationAppKey.URL_GENERATOR]: 'URL-Generator',
    [TranslatorTranslationAppKey.URL_GENERATOR_HINT]: 'Erzeuge eine Autorisierungs-URL, indem du die benötigten Bereiche auswählst.',
    [TranslatorTranslationAppKey.REDIRECT_URL]: 'Weiterleitungs-URL',
    [TranslatorTranslationAppKey.GENERATED_URL]: 'Generierte URL',

    [TranslatorTranslationAppKey.TOGGLE_NAVIGATION]: 'Navigation umschalten',

    [TranslatorTranslationAppKey.SESSION_RENEW]: 'Die Sitzung wird erneuert in {countdown}.',
    [TranslatorTranslationAppKey.MINUTES]: 'Minute(n)',
    [TranslatorTranslationAppKey.SECONDS]: 'Sekunde(n)',

    [TranslatorTranslationAppKey.ENTITY_CREATED]: '{{entity}} wurde erfolgreich erstellt.',
    [TranslatorTranslationAppKey.ENTITY_UPDATED]: '{{entity}} wurde erfolgreich aktualisiert.',
    [TranslatorTranslationAppKey.ENTITY_DELETED]: '{{entity}} "{{name}}" wurde erfolgreich gelöscht.',
    [TranslatorTranslationAppKey.ACCOUNT_UPDATED]: 'Das Konto wurde erfolgreich aktualisiert.',

    [TranslatorTranslationAppKey.DELETE_CONFIRM_TITLE]: '{{entity}} wirklich löschen?',
    [TranslatorTranslationAppKey.DELETE_CONFIRM_DESCRIPTION]: 'Diese Aktion kann nicht rückgängig gemacht werden.',

    [TranslatorTranslationAppKey.REMOVE_CONFIRM_TITLE]: 'Entfernen bestätigen',
    [TranslatorTranslationAppKey.REMOVE_CONFIRM_DESCRIPTION]: 'Möchten Sie diese Zuordnung wirklich entfernen? Sie können sie jederzeit erneut zuweisen.',

    [TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS]: 'Andere Geräte abmelden',
    [TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS_CONFIRM_TITLE]: 'Andere Geräte abmelden?',
    [TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS_CONFIRM_DESCRIPTION]: 'Dadurch werden alle anderen Sitzungen abgemeldet. Ihre aktuelle Sitzung bleibt aktiv.',
    [TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS_SUCCESS]: '{{amount}} andere Sitzung(en) abgemeldet.',

    [TranslatorTranslationAppKey.SESSION_REVOKE_ALL]: 'Überall abmelden',
    [TranslatorTranslationAppKey.SESSION_REVOKE_ALL_CONFIRM_TITLE]: 'Diesen Benutzer überall abmelden?',
    [TranslatorTranslationAppKey.SESSION_REVOKE_ALL_CONFIRM_DESCRIPTION]: 'Dadurch werden alle Sitzungen dieses Benutzers auf allen Geräten abgemeldet.',
    [TranslatorTranslationAppKey.SESSION_REVOKE_ALL_SUCCESS]: '{{amount}} Sitzung(en) abgemeldet.',

    [TranslatorTranslationAppKey.SESSION_CURRENT]: 'Dieses Gerät',
    [TranslatorTranslationAppKey.SESSION_TOKEN_STATUS_ACTIVE]: 'Aktiv',
    [TranslatorTranslationAppKey.SESSION_TOKEN_STATUS_CONSUMED]: 'Verbraucht',
    [TranslatorTranslationAppKey.SESSION_TOKEN_STATUS_REVOKED]: 'Widerrufen',
    [TranslatorTranslationAppKey.SESSION_TOKEN_STATUS_EXPIRED]: 'Abgelaufen',

    [TranslatorTranslationAppKey.AUTHENTICATOR]: 'Authentifikatoren',
    [TranslatorTranslationAppKey.MFA_SECURITY_TITLE]: 'Zwei-Faktor-Authentifizierung',
    [TranslatorTranslationAppKey.MFA_SECURITY_HINT]: 'Füge mit einer Authenticator-App oder Wiederherstellungscodes eine zusätzliche Sicherheitsebene hinzu.',

    [TranslatorTranslationAppKey.APPLICATIONS]: 'Anwendungen',
    [TranslatorTranslationAppKey.CONSENT_EMPTY]: 'Du hast noch keiner Anwendung Zugriff gewährt.',
    [TranslatorTranslationAppKey.CONSENT_REVOKE]: 'Widerrufen',
    [TranslatorTranslationAppKey.CONSENT_REVOKE_ALL]: 'Zugriff widerrufen',
    [TranslatorTranslationAppKey.CONSENT_REVOKE_ALL_SUCCESS]: 'Der Anwendungszugriff wurde widerrufen.',
    [TranslatorTranslationAppKey.CONSENT_REVOKE_ALL_TITLE]: 'Anwendungszugriff widerrufen',
    [TranslatorTranslationAppKey.CONSENT_REVOKE_ALL_DESCRIPTION]: 'Die Anwendung wird bei der nächsten Anmeldung erneut um deine Einwilligung bitten.',
    [TranslatorTranslationAppKey.CONSENT_SCOPES]: 'Gewährte Berechtigungen',
    [TranslatorTranslationAppKey.KEY_DELETE_FORCE_CONFIRM_TITLE]: 'Verschlüsselungsschlüssel unwiderruflich löschen?',
    [TranslatorTranslationAppKey.KEY_DELETE_FORCE_CONFIRM_DESCRIPTION]: 'Dieser Schlüssel wird noch von {{count}} verschlüsselten Geheimnissen referenziert. Das Löschen macht sie dauerhaft unlesbar.',

    [TranslatorTranslationAppKey.BACK_TO_APP]: 'Zurück zu {{host}}',
};
