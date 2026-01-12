/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LinesRecord } from 'ilingo';
import { TranslatorTranslationClientKey } from '../constants';

export const TranslatorTranslationClientEnglish : LinesRecord = {
    [TranslatorTranslationClientKey.NAME_HINT]: 'Something users will recognize and trust',
    [TranslatorTranslationClientKey.DESCRIPTION_HINT]: 'Displayed to all users of this application',
    [TranslatorTranslationClientKey.REDIRECT_URI_HINT]: 'URI pattern a browser can redirect to after a successful login',
    [TranslatorTranslationClientKey.IS_CONFIDENTIAL]: 'Is confidential?',
    [TranslatorTranslationClientKey.HASH_SECRET]: 'Hash secret?',
};
