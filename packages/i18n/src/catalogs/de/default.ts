/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationDefaultKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationDefaultGerman : NamespaceTranslations<`${TranslatorTranslationDefaultKey}`> = {
    [TranslatorTranslationDefaultKey.ADD]: 'Hinzufügen',
    [TranslatorTranslationDefaultKey.CREATE]: 'Erstellen',
    [TranslatorTranslationDefaultKey.DELETE]: 'Löschen',
    [TranslatorTranslationDefaultKey.GENERATE]: 'Generieren',
    [TranslatorTranslationDefaultKey.UPDATE]: 'Aktualisieren',

    [TranslatorTranslationDefaultKey.ACTIVE]: 'Aktiv',
    [TranslatorTranslationDefaultKey.INACTIVE]: 'Inaktiv',

    [TranslatorTranslationDefaultKey.LOCKED]: 'Gesperrt',
    [TranslatorTranslationDefaultKey.NOT_LOCKED]: 'Nicht gesperrt',

    [TranslatorTranslationDefaultKey.VALUE_IS_REGEX]: 'Ist der Wert ein Regex-Muster?',

    [TranslatorTranslationDefaultKey.CLIENT]: 'Client',
    [TranslatorTranslationDefaultKey.CLIENTS]: 'Clients',
    [TranslatorTranslationDefaultKey.CLIENT_SCOPES]: 'Client-Bereiche',
    [TranslatorTranslationDefaultKey.DISPLAY_NAME]: 'Anzeigename',
    [TranslatorTranslationDefaultKey.EMAIL]: 'E-Mail',
    [TranslatorTranslationDefaultKey.EXTERNAL_ID]: 'Externe ID',
    [TranslatorTranslationDefaultKey.HASHED]: 'Gehasht',
    [TranslatorTranslationDefaultKey.OVERVIEW]: 'Überblick',
    [TranslatorTranslationDefaultKey.IDENTITY_PROVIDERS]: 'Identitätsanbieter',
    [TranslatorTranslationDefaultKey.NAME]: 'Name',
    [TranslatorTranslationDefaultKey.DECISION_STRATEGY]: 'Entscheidungsstrategie',
    [TranslatorTranslationDefaultKey.DESCRIPTION]: 'Beschreibung',
    [TranslatorTranslationDefaultKey.PERMISSIONS]: 'Berechtigungen',
    [TranslatorTranslationDefaultKey.POLICY]: 'Richtlinie',
    [TranslatorTranslationDefaultKey.POLICIES]: 'Richtlinien',
    [TranslatorTranslationDefaultKey.REALM]: 'Organisation',
    [TranslatorTranslationDefaultKey.ROBOTS]: 'Roboter',
    [TranslatorTranslationDefaultKey.REALMS]: 'Organisationen',
    [TranslatorTranslationDefaultKey.ROLES]: 'Rollen',
    [TranslatorTranslationDefaultKey.SCOPES]: 'Bereiche',
    [TranslatorTranslationDefaultKey.SECRET]: 'Geheimnis',
    [TranslatorTranslationDefaultKey.REDIRECT_URIS]: 'Weiterleitungs-URIs',
    [TranslatorTranslationDefaultKey.USERS]: 'Benutzer',
};
