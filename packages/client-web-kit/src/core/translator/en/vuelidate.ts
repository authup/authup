/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LinesRecord } from 'ilingo';
import { VuelidateCustomRuleKey } from '../../vuelidate';

export const TranslatorTranslationVuelidateEnglish : LinesRecord = {
    [VuelidateCustomRuleKey.ALPHA_NUM_HYPHEN_UNDERSCORE]: 'The input value is only allowed to consist of the following characters: [0-9a-z-_]+',
    [VuelidateCustomRuleKey.ALPHA_UPPER_NUM_HYPHEN_UNDERSCORE_DOT]: 'The input value is only allowed to consist of the following characters: [0-9a-zA-Z-_.]+',
};
