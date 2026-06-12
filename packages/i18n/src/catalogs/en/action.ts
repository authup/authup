/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationActionKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationActionEnglish : NamespaceTranslations<`${TranslatorTranslationActionKey}`> = {
    [TranslatorTranslationActionKey.ADD]: 'Add',
    [TranslatorTranslationActionKey.CREATE]: 'Create',
    [TranslatorTranslationActionKey.DELETE]: 'Delete',
    [TranslatorTranslationActionKey.GENERATE]: 'Generate',
    [TranslatorTranslationActionKey.UPDATE]: 'Update',
    [TranslatorTranslationActionKey.AUTHORIZE]: 'Authorize',
    [TranslatorTranslationActionKey.ABORT]: 'Abort',
    [TranslatorTranslationActionKey.LOGIN]: 'Login',

    [TranslatorTranslationActionKey.REGISTER]: 'Register',
    [TranslatorTranslationActionKey.ACTIVATE]: 'Activate',
    [TranslatorTranslationActionKey.RESET]: 'Reset',
    [TranslatorTranslationActionKey.SEND]: 'Send',
    [TranslatorTranslationActionKey.BACK]: 'Back',
    [TranslatorTranslationActionKey.CLOSE]: 'Close',
    [TranslatorTranslationActionKey.LOOKUP]: 'Lookup',
    [TranslatorTranslationActionKey.SHOW]: 'Show',
    [TranslatorTranslationActionKey.HIDE]: 'Hide',
};
