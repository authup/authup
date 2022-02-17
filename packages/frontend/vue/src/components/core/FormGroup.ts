/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import template from 'lodash/template';
import Vue from 'vue';
import { LanguageFormEnglish } from '../language/en/form';
import { LanguageFormGerman } from '../language/de/form';
import { LanguageFormMap } from '../language/type';

type FormGroupComputed = {
    errors: string[],
    languageMap: LanguageFormMap,
    invalid: boolean
};

export type FormGroupSlotScope = FormGroupComputed;

export type FormGroupProperties = {
    validations: Record<string, any>,
    language?: string,
};

export const FormGroup = Vue.extend<Record<string, any>, any, FormGroupComputed, FormGroupProperties>({
    props: {
        validations: {
            required: true,
            type: Object,
            default: undefined,
        },
        language: {
            required: false,
            type: String,
            default: 'en',
        },
    },
    computed: {
        errors() {
            if (!this.invalid) {
                return [];
            }

            return Object.keys(this.validations.$params).reduce(
                (errors: string[], validator) => {
                    if (
                        !this.validations[validator] &&
                        Object.prototype.hasOwnProperty.call(this.languageMap, validator)
                    ) {
                        const compiled = template(this.languageMap[validator], {
                            interpolate: /{{([\s\S]+?)}}/g,
                        });

                        if (this.validations.$params[validator]) {
                            const output = compiled(this.validations.$params[validator]);

                            errors.push(output);
                        } else {
                            errors.push(`The ${validator} operator condition is not fulfilled.`);
                        }
                    }

                    return errors;
                },
                [],
            );
        },
        languageMap() {
            switch (this.language) {
                case 'de':
                    return LanguageFormGerman;
                default:
                    return LanguageFormEnglish;
            }
        },
        invalid() {
            return this.validations &&
                    this.validations.$dirty &&
                    this.validations.$invalid;
        },
    },
    render() {
        return this.$scopedSlots.default({
            errors: this.errors,
            invalid: this.invalid,
        });
    },
});
