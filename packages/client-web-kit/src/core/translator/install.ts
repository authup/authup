/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MemoryStore } from '@ilingo/vuelidate/core';
import { install } from '@ilingo/vuelidate';
import type { App } from 'vue';
import { LanguageAppGerman } from './de/app';
import { LanguageFormGerman } from './de/form';
import { LanguageValidationGerman } from './de/validation';
import { LanguageAppEnglish } from './en/app';
import { LanguageFormEnglish } from './en/form';
import { LanguageValidationEnglish } from './en/validation';
import type { TranslatorInstallOptions } from './types';

export function installTranslator(app: App, options: TranslatorInstallOptions = {}) {
    const store = new MemoryStore({
        data: {
            de: {
                app: LanguageAppGerman,
                form: LanguageFormGerman,
                vuelidate: LanguageValidationGerman,
            },
            en: {
                app: LanguageAppEnglish,
                form: LanguageFormEnglish,
                vuelidate: LanguageValidationEnglish,
            },
        },
    });

    install(app, {
        store,
        locale: options.locale,
    });
}
