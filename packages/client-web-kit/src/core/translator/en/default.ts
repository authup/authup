/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LinesRecord } from 'ilingo';
import { TranslatorTranslationDefaultKey } from '../constants';

export const TranslatorTranslationDefaultEnglish : LinesRecord = {
    [TranslatorTranslationDefaultKey.ADD]: 'add',
    [TranslatorTranslationDefaultKey.CREATE]: 'create',
    [TranslatorTranslationDefaultKey.DELETE]: 'delete',
    [TranslatorTranslationDefaultKey.GENERATE]: 'generate',
    [TranslatorTranslationDefaultKey.UPDATE]: 'update',

    [TranslatorTranslationDefaultKey.ACTIVE]: 'active',
    [TranslatorTranslationDefaultKey.INACTIVE]: 'inactive',

    [TranslatorTranslationDefaultKey.LOCKED]: 'locked',
    [TranslatorTranslationDefaultKey.NOT_LOCKED]: 'not locked',

    [TranslatorTranslationDefaultKey.VALUE_IS_REGEX]: 'Value is regex pattern?',

    [TranslatorTranslationDefaultKey.CLIENT]: 'update',
    [TranslatorTranslationDefaultKey.CLIENTS]: 'clients',
    [TranslatorTranslationDefaultKey.CLIENT_SCOPES]: 'client scopes',
    [TranslatorTranslationDefaultKey.DISPLAY_NAME]: 'display name',
    [TranslatorTranslationDefaultKey.EMAIL]: 'email',
    [TranslatorTranslationDefaultKey.EXTERNAL_ID]: 'external id',
    [TranslatorTranslationDefaultKey.HASHED]: 'hashed',
    [TranslatorTranslationDefaultKey.OVERVIEW]: 'overview',
    [TranslatorTranslationDefaultKey.IDENTITY_PROVIDERS]: 'identity providers',
    [TranslatorTranslationDefaultKey.NAME]: 'name',
    [TranslatorTranslationDefaultKey.DESCRIPTION]: 'description',
    [TranslatorTranslationDefaultKey.POLICIES]: 'policies',
    [TranslatorTranslationDefaultKey.PERMISSIONS]: 'permissions',
    [TranslatorTranslationDefaultKey.REALM]: 'realm',
    [TranslatorTranslationDefaultKey.REALMS]: 'realms',
    [TranslatorTranslationDefaultKey.ROLES]: 'roles',
    [TranslatorTranslationDefaultKey.SCOPES]: 'scopes',
    [TranslatorTranslationDefaultKey.SECRET]: 'secret',
    [TranslatorTranslationDefaultKey.REDIRECT_URIS]: 'redirect uri(s)',
    [TranslatorTranslationDefaultKey.USERS]: 'users',
};
