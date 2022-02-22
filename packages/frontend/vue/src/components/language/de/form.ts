/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LanguageFormMap } from '../type';
import { alphaWithUpperNumHyphenUnderScore } from '../../utils/vuelidate';

export const LanguageFormGerman : LanguageFormMap = {
    email: 'Die Eingabe muss eine gültige E-Mail sein.',
    maxLength: 'Die Länge der Eingabe muss kleiner als {{max}} sein.',
    minLength: 'Die Länge der Eingabe muss größer als {{max}} sein.',
    required: 'Ein Eingabewert wird benötigt.',
    sameAs: 'Der Eingabewert entspricht nicht dem Wert der Eingabe von {{field}}',
    alphaNumHyphenUnderscore: 'Der Eingabewert darf nur aus folgenden Zeichen bestehen: [0-9a-z-_]+',
    alphaWithUpperNumHyphenUnderscore: 'Der Eingabewert darf nur aus folgenden Zeichen bestehen: [0-9a-zA-Z-_]+',
};
