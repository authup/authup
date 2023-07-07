/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LinesRecord } from 'ilingo';

export const LanguageValidationEnglish : LinesRecord = {
    email: 'The input must be a valid email address',
    maxLength: 'The length of the input must be less than {{max}}',
    minLength: 'The length of the input must be greater than {{min}}',
    required: 'An input value is required',
    sameAs: 'The input value is not equal to the value of {{equalTo}}',
    url: 'The input value must be a valid URL',
    alphaNumHyphenUnderscore: 'The input value is only allowed to consist of the following characters: [0-9a-z-_]+',
    alphaWithUpperNumHyphenUnderscore: 'The input value is only allowed to consist of the following characters: [0-9a-zA-Z-_]+',
    permissionNamePattern: 'The input value must match the following regex pattern: [a-zA-Z-]+_[a-zA-Z-]+',
};
