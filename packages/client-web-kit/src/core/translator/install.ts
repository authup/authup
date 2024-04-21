/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MemoryStore } from '@ilingo/vuelidate/core';
import { install } from '@ilingo/vuelidate';
import type { App } from 'vue';
import { TranslatorTranslationGroup } from './constants';
import {
    TranslatorTranslationClientGerman,
    TranslatorTranslationFormGerman,
    TranslatorTranslationVuecsGerman,
    TranslatorTranslationVuelidateGerman,
} from './de';
import {
    TranslatorTranslationClientEnglish,
    TranslatorTranslationFormEnglish,
    TranslatorTranslationVuecsEnglish,
    TranslatorTranslationVuelidateEnglish,
} from './en';
import type { TranslatorInstallOptions } from './types';

export function installTranslator(app: App, options: TranslatorInstallOptions = {}) {
    const store = new MemoryStore({
        data: {
            de: {
                [TranslatorTranslationGroup.CLIENT]: TranslatorTranslationClientGerman,
                [TranslatorTranslationGroup.FORM]: TranslatorTranslationFormGerman,
                [TranslatorTranslationGroup.VUECS]: TranslatorTranslationVuecsGerman,
                [TranslatorTranslationGroup.VUELIDATE]: TranslatorTranslationVuelidateGerman,
            },
            en: {
                [TranslatorTranslationGroup.CLIENT]: TranslatorTranslationClientEnglish,
                [TranslatorTranslationGroup.FORM]: TranslatorTranslationFormEnglish,
                [TranslatorTranslationGroup.VUECS]: TranslatorTranslationVuecsEnglish,
                [TranslatorTranslationGroup.VUELIDATE]: TranslatorTranslationVuelidateEnglish,
            },
        },
    });

    install(app, {
        store,
        locale: options.locale,
    });
}
