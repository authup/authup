/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LinesRecord } from 'ilingo';
import { VuelidateCustomRuleKey } from '../../vuelidate';

export const TranslatorTranslationVuelidateGerman : LinesRecord = {
    [VuelidateCustomRuleKey.ALPHA_NUM_HYPHEN_UNDERSCORE]: 'Der Eingabewert darf nur aus folgenden Zeichen bestehen: [0-9a-z-_]+',
    [VuelidateCustomRuleKey.ALPHA_UPPER_NUM_HYPHEN_UNDERSCORE_DOT]: 'Der Eingabewert darf nur aus folgenden Zeichen bestehen: [0-9a-zA-Z-_.]+',
};
