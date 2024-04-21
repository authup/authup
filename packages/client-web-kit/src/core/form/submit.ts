/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { FormSubmitOptionsInput } from '@vuecs/form-controls';
import { buildFormSubmit } from '@vuecs/form-controls';
import type { Ref, VNodeChild } from 'vue';
import { TranslatorTranslationFormKey, TranslatorTranslationGroup, useTranslation } from '../translator';

type FormSubmitTranslations = {
    createText: Ref<string>,
    updateText: Ref<string>,
};

export function createFormSubmitTranslations() : FormSubmitTranslations {
    const updateText = useTranslation({
        group: TranslatorTranslationGroup.FORM,
        key: TranslatorTranslationFormKey.UPDATE_BUTTON_TEXT,
    });
    const createText = useTranslation({
        group: TranslatorTranslationGroup.FORM,
        key: TranslatorTranslationFormKey.CREATE_BUTTON_TEXT,
    });

    return {
        createText,
        updateText,
    };
}

export function buildFormSubmitWithTranslations(
    options: FormSubmitOptionsInput,
    translations: FormSubmitTranslations,
) : VNodeChild {
    options.createText = translations.createText.value;
    options.updateText = translations.updateText.value;

    return buildFormSubmit(options);
}
