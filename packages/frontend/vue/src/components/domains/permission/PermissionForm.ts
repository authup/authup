/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { CreateElement, PropType, VNode } from 'vue';
import { maxLength, minLength, required } from 'vuelidate/lib/validators';
import { Permission } from '@typescript-auth/domains';
import { ComponentFormData } from '../../helpers';
import { buildFormInput } from '../../helpers/form/render/input';
import { buildFormSubmit } from '../../helpers/form/render';
import { useHTTPClient } from '../../../utils';

type Properties = {
    [key: string]: any;

    entity?: Partial<Permission>
};

export const PermissionForm = Vue.extend<ComponentFormData<Permission>, any, any, Properties>({
    name: 'PermissionForm',
    props: {
        entityProperty: {
            type: Object as PropType<Permission>,
            default: undefined,
        },
    },
    data() {
        return {
            form: {
                id: '',
            },

            busy: false,
        };
    },
    validations: {
        form: {
            id: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(30),
            },
        },
    },
    computed: {
        isEditing() {
            return this.entityProperty &&
                Object.prototype.hasOwnProperty.call(this.entityProperty, 'id');
        },
    },
    created() {
        if (this.isEditing) {
            this.form.id = this.entityProperty.id;
        }
    },
    methods: {
        async submit() {
            if (this.busy || this.$v.$invalid) {
                return;
            }

            this.message = null;
            this.busy = true;

            try {
                let response;

                if (this.isEditing) {
                    response = await useHTTPClient().permission.update(this.entityProperty.id, this.form);
                    this.$emit('updated', response);
                } else {
                    response = await useHTTPClient().permission.create(this.form);
                    this.$emit('created', response);
                }
            } catch (e) {
                if (e instanceof Error) {
                    this.$emit('failed', e);
                }
            }

            this.busy = false;
        },
    },
    render(createElement: CreateElement): VNode {
        const vm = this;
        const h = createElement;

        const id = buildFormInput(this, h, {
            title: 'ID',
            propName: 'id',
        });

        const submit = buildFormSubmit(this, h);

        return h('form', {
            on: {
                submit($event: any) {
                    $event.preventDefault();

                    return vm.submit.apply(null);
                },
            },
        }, [
            id,
            submit,
        ]);
    },
});
