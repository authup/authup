/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationDefaultKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationDefaultEnglish : NamespaceTranslations<`${TranslatorTranslationDefaultKey}`> = {
    [TranslatorTranslationDefaultKey.ADD]: 'Add',
    [TranslatorTranslationDefaultKey.CREATE]: 'Create',
    [TranslatorTranslationDefaultKey.DELETE]: 'Delete',
    [TranslatorTranslationDefaultKey.GENERATE]: 'Generate',
    [TranslatorTranslationDefaultKey.UPDATE]: 'Update',

    [TranslatorTranslationDefaultKey.ACTIVE]: 'Active',
    [TranslatorTranslationDefaultKey.INACTIVE]: 'Inactive',

    [TranslatorTranslationDefaultKey.LOCKED]: 'Locked',
    [TranslatorTranslationDefaultKey.NOT_LOCKED]: 'Not locked',

    [TranslatorTranslationDefaultKey.VALUE_IS_REGEX]: 'Is the value a regex pattern?',

    [TranslatorTranslationDefaultKey.CLIENT]: 'Client',
    [TranslatorTranslationDefaultKey.CLIENTS]: 'Clients',
    [TranslatorTranslationDefaultKey.CLIENT_SCOPES]: 'Client scopes',
    [TranslatorTranslationDefaultKey.DISPLAY_NAME]: 'Display name',
    [TranslatorTranslationDefaultKey.EMAIL]: 'Email',
    [TranslatorTranslationDefaultKey.EXTERNAL_ID]: 'External ID',
    [TranslatorTranslationDefaultKey.HASHED]: 'Hashed',
    [TranslatorTranslationDefaultKey.OVERVIEW]: 'Overview',
    [TranslatorTranslationDefaultKey.IDENTITY_PROVIDERS]: 'Identity providers',
    [TranslatorTranslationDefaultKey.NAME]: 'Name',
    [TranslatorTranslationDefaultKey.DECISION_STRATEGY]: 'Decision strategy',
    [TranslatorTranslationDefaultKey.DESCRIPTION]: 'Description',
    [TranslatorTranslationDefaultKey.PERMISSIONS]: 'Permissions',
    [TranslatorTranslationDefaultKey.POLICY]: 'Policy',
    [TranslatorTranslationDefaultKey.POLICIES]: 'Policies',
    [TranslatorTranslationDefaultKey.REALM]: 'Realm',
    [TranslatorTranslationDefaultKey.ROBOTS]: 'Robots',
    [TranslatorTranslationDefaultKey.REALMS]: 'Realms',
    [TranslatorTranslationDefaultKey.ROLES]: 'Roles',
    [TranslatorTranslationDefaultKey.SCOPES]: 'Scopes',
    [TranslatorTranslationDefaultKey.SECRET]: 'Secret',
    [TranslatorTranslationDefaultKey.REDIRECT_URIS]: 'Redirect URI(s)',
    [TranslatorTranslationDefaultKey.USERS]: 'Users',
};
