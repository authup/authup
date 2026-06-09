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

    [TranslatorTranslationAppKey.URL_GENERATOR]: 'URL-Generator',
    [TranslatorTranslationAppKey.URL_GENERATOR_HINT]: 'Erzeuge eine Autorisierungs-URL, indem du die benötigten Bereiche auswählst.',
    [TranslatorTranslationAppKey.REDIRECT_URL]: 'Weiterleitungs-URL',
    [TranslatorTranslationAppKey.GENERATED_URL]: 'Generierte URL',

    [TranslatorTranslationAppKey.TOGGLE_NAVIGATION]: 'Navigation umschalten',
    [TranslatorTranslationAppKey.SWITCH_TO_LIGHT_MODE]: 'Zum hellen Modus wechseln',
    [TranslatorTranslationAppKey.SWITCH_TO_DARK_MODE]: 'Zum dunklen Modus wechseln',

    [TranslatorTranslationAppKey.SESSION_RENEW]: 'Die Sitzung wird erneuert in',
    [TranslatorTranslationAppKey.MINUTES]: 'Minute(n)',
    [TranslatorTranslationAppKey.SECONDS]: 'Sekunde(n)',

    [TranslatorTranslationAppKey.ENTITY_CREATED]: '{{entity}} wurde erfolgreich erstellt.',
    [TranslatorTranslationAppKey.ENTITY_UPDATED]: '{{entity}} wurde erfolgreich aktualisiert.',
    [TranslatorTranslationAppKey.ENTITY_DELETED]: '{{entity}} "{{name}}" wurde erfolgreich gelöscht.',
    [TranslatorTranslationAppKey.ACCOUNT_UPDATED]: 'Das Konto wurde erfolgreich aktualisiert.',
};
