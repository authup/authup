/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type LanguageFormType = 'email' |
'maxLength' |
'minLength' |
'required' |
'sameAs' |
'alphaNumHyphenUnderscore' |
'alphaWithUpperNumHyphenUnderscore';

export type LanguageFormMap = Record<LanguageFormType, string>;
