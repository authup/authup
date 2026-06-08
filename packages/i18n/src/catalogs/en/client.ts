/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationClientKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationClientEnglish : NamespaceTranslations<`${TranslatorTranslationClientKey}`> = {
    [TranslatorTranslationClientKey.NAME_HINT]: 'Something users will recognize and trust',
    [TranslatorTranslationClientKey.DESCRIPTION_HINT]: 'Displayed to all users of this application',
    [TranslatorTranslationClientKey.REDIRECT_URI_HINT]: 'URI pattern a browser can redirect to after a successful login',
    [TranslatorTranslationClientKey.IS_CONFIDENTIAL]: 'Is confidential?',
    [TranslatorTranslationClientKey.IS_ACTIVE]: 'Is active?',
    [TranslatorTranslationClientKey.HASH_SECRET]: 'Hash secret?',

    [TranslatorTranslationClientKey.LOGIN_FAILED]: 'The login operation failed',
    [TranslatorTranslationClientKey.SCOPE_GRANT_INTRO]: 'This will allow the {{client}} application to',
    [TranslatorTranslationClientKey.ONCE_AUTHORIZED_REDIRECT]: 'Once authorized, you will be redirected to:',
    [TranslatorTranslationClientKey.GOVERNED_BY]: 'This application is governed by the {{client}} application\'s Privacy Policy and Terms of Service.',
    [TranslatorTranslationClientKey.ACTIVE_SINCE]: 'Active since',
    [TranslatorTranslationClientKey.VIEW_POLICY_DETAILS]: 'View policy details',
};
