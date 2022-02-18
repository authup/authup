/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type ComponentFormMethods<T = Record<string, any>> = {
    [key: string]: any,
    submit: () => Promise<void>
};

export type ComponentFormComputed<T = Record<string, any>> = {
    isEditing: boolean
};

export type ComponentFormData<T = Record<string, any>> = {
    busy: boolean,
    form: Partial<T> | null
};

export type ComponentFormVuelidate<T = Record<string, any>> = {
    $v: {
        [key: string]: any,
        form: {
            [K in keyof T]: any
        }
    }
};
