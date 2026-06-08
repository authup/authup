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
};
