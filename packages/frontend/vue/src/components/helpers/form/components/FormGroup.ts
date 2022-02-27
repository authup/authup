/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue from 'vue';
import { useAuthIlingo } from '../../../language/singleton';

type FormGroupComputed = {
    errors: string[],
    invalid: boolean
};

export type FormGroupSlotScope = FormGroupComputed;

export type FormGroupProperties = {
    validations: Record<string, any>,
    locale?: string,
};

export const FormGroup = Vue.extend<Record<string, any>, any, FormGroupComputed, FormGroupProperties>({
    props: {
        validations: {
            required: true,
            type: Object,
        },
        locale: {
            required: false,
            type: String,
            default: undefined,
        },
    },
    computed: {
        errors() {
            if (!this.invalid) {
                return [];
            }

            let { locale } = this;

            if (!locale && this.ilingo) {
                locale = this.ilingo.getLocale();
            }

            if (!locale && this.$ilingo) {
                locale = this.$ilingo.getLocale();
            }

            return Object.keys(this.validations.$params).reduce(
                (errors: string[], validator) => {
                    if (!this.validations[validator]) {
                        // hope that lang file is already loaded ;)
                        let output = useAuthIlingo()
                            .getSync(
                                `validation.${validator}`,
                                this.validations.$params[validator],
                                locale,
                            );

                        output = output !== validator ?
                            output :
                            useAuthIlingo()
                                .getSync(
                                    'app.validator.alt',
                                    { validator },
                                    locale,
                                );

                        errors.push(output);
                    }

                    return errors;
                },
                [],
            );
        },
        invalid() {
            return this.validations &&
                    this.validations.$dirty &&
                    this.validations.$invalid;
        },
    },
    created() {
        // todo : use system wide ilingo cache, for other locales ?
        /*
        if (this.$ilingo) {
            useAuthIlingo()
                .setCache(this.$ilingo.getCache());
        }
        */
    },
    render() {
        return this.$scopedSlots.default({
            errors: this.errors,
            invalid: this.invalid,
        });
    },
});
