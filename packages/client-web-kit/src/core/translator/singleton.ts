/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Ilingo } from 'ilingo';
import { LanguageValidationGerman } from './de/validation';
import { LanguageValidationEnglish } from './en/validation';
import { LanguageAppEnglish } from './en/app';
import { LanguageAppGerman } from './de/app';
import { LanguageFormGerman } from './de/form';
import { LanguageFormEnglish } from './en/form';

let instance : Ilingo | undefined;

export function useTranslator() {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    instance = new Ilingo({
        data: {
            de: {
                app: LanguageAppGerman,
                form: LanguageFormGerman,
                validation: LanguageValidationGerman,
            },
            en: {
                app: LanguageAppEnglish,
                form: LanguageFormEnglish,
                validation: LanguageValidationEnglish,
            },
        },
    });

    return instance;
}
