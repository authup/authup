/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LinesRecord } from 'ilingo';
import { TranslatorTranslationDefaultKey } from '../constants';

export const TranslatorTranslationDefaultGerman: LinesRecord = {
    [TranslatorTranslationDefaultKey.ADD]: 'hinzufügen',
    [TranslatorTranslationDefaultKey.CREATE]: 'erstellen',
    [TranslatorTranslationDefaultKey.DELETE]: 'löschen',
    [TranslatorTranslationDefaultKey.GENERATE]: 'generieren',
    [TranslatorTranslationDefaultKey.UPDATE]: 'aktualisieren',

    [TranslatorTranslationDefaultKey.ACTIVE]: 'aktiv',
    [TranslatorTranslationDefaultKey.INACTIVE]: 'inaktiv',

    [TranslatorTranslationDefaultKey.LOCKED]: 'gesperrt',
    [TranslatorTranslationDefaultKey.NOT_LOCKED]: 'nicht gesperrt',

    [TranslatorTranslationDefaultKey.VALUE_IS_REGEX]: 'Wert ist regex pattern?',

    [TranslatorTranslationDefaultKey.CLIENT]: 'Client',
    [TranslatorTranslationDefaultKey.CLIENTS]: 'Clients',
    [TranslatorTranslationDefaultKey.CLIENT_SCOPES]: 'Client-Bereiche',
    [TranslatorTranslationDefaultKey.DISPLAY_NAME]: 'Anzeigename',
    [TranslatorTranslationDefaultKey.EMAIL]: 'E-Mail',
    [TranslatorTranslationDefaultKey.EXTERNAL_ID]: 'externe ID',
    [TranslatorTranslationDefaultKey.HASHED]: 'gehasht',
    [TranslatorTranslationDefaultKey.OVERVIEW]: 'Überblick',
    [TranslatorTranslationDefaultKey.IDENTITY_PROVIDERS]: 'Identitätsanbieter',
    [TranslatorTranslationDefaultKey.NAME]: 'Name',
    [TranslatorTranslationDefaultKey.DESCRIPTION]: 'Beschreibung',
    [TranslatorTranslationDefaultKey.PERMISSIONS]: 'Berechtigungen',
    [TranslatorTranslationDefaultKey.POLICIES]: 'Richtlinien',
    [TranslatorTranslationDefaultKey.REALM]: 'Organisation',
    [TranslatorTranslationDefaultKey.REALMS]: 'Organisationen',
    [TranslatorTranslationDefaultKey.ROLES]: 'Rollen',
    [TranslatorTranslationDefaultKey.SCOPES]: 'Bereiche',
    [TranslatorTranslationDefaultKey.SECRET]: 'Geheimnis',
    [TranslatorTranslationDefaultKey.REDIRECT_URIS]: 'Weiterleitungs-URIs',
    [TranslatorTranslationDefaultKey.USERS]: 'Benutzer',
};
