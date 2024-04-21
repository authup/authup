/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum TranslatorTranslationGroup {
    FORM = 'form',

    CLIENT = 'authupClient',

    VUECS = 'vuecs',
    VUELIDATE = 'vuelidate',
}

export enum TranslatorTranslationVuecsKey {
    NO_MORE = 'noMore',
}

export enum TranslatorTranslationClientKey {
    NAME_HINT = 'nameHint',
    DESCRIPTION_HINT = 'descriptionHint',
    REDIRECT_URI_HINT = 'redirectURIHint',
    IS_CONFIDENTIAL = 'isConfidential',
}

export enum TranslatorTranslationFormKey {
    ADD_BUTTON_TEXT = 'addButtonText',
    CREATE_BUTTON_TEXT = 'createButtonText',
    DELETE_BUTTON_TEXT = 'deleteButtonText',
    GENERATE_BUTTON_TEXT = 'generateButtonText',
    UPDATE_BUTTON_TEXT = 'updateButtonText',

    NAME_LABEL = 'nameLabel',
    DESCRIPTION_LABEL = 'descriptionLabel',
}
