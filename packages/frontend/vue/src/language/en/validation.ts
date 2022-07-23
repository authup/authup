/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Lines } from 'ilingo';

export const LanguageValidationEnglish : Lines = {
    email: 'The input must be a valid email address.',
    maxLength: 'The length of the input must be less than {{max}}.',
    minLength: 'The length of the input must be greater than {{min}}.',
    required: 'An input value is required.',
    sameAs: 'The input value is not equal to the value of {{eq}}',
    alphaNumHyphenUnderscore: 'The input value is only allowed to consist of the following characters: [0-9a-z-_]+',
    alphaWithUpperNumHyphenUnderscore: 'The input value is only allowed to consist of the following characters: [0-9a-zA-Z-_]+',
};
