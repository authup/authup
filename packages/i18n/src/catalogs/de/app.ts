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
    [TranslatorTranslationAppKey.SECURITY]: 'Sicherheit',

    [TranslatorTranslationAppKey.MANAGEMENT]: 'Verwaltung',
    [TranslatorTranslationAppKey.DETAILS]: 'Details',
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

    [TranslatorTranslationAppKey.DELETE_CONFIRM_TITLE]: 'Löschen bestätigen',
    [TranslatorTranslationAppKey.DELETE_CONFIRM_DESCRIPTION]: 'Möchten Sie diese(s) {{entity}} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
};
