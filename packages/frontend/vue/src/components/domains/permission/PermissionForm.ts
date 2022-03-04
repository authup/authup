/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { CreateElement, PropType, VNode } from 'vue';
import { maxLength, minLength, required } from 'vuelidate/lib/validators';
import { Permission } from '@typescript-auth/domains';
import { ComponentFormData, buildFormInput, buildFormSubmit } from '@vue-layout/utils';
import { useHTTPClient } from '../../../utils';
import { initPropertiesFromSource } from '../../utils/proprety';
import { useAuthIlingo } from '../../language/singleton';

type Properties = {
    [key: string]: any;

    entity?: Partial<Permission>
};

export const PermissionForm = Vue.extend<ComponentFormData<Permission>, any, any, Properties>({
    name: 'PermissionForm',
    props: {
        entity: {
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
        updatedAt() {
            return this.entity ? this.entity.updated_at : undefined;
        },
    },
    watch: {
        updatedAt(val, oldVal) {
            if (val && val !== oldVal) {
                this.initFromProperties();
            }
        },
    },
    created() {
        Promise.resolve()
            .then(this.initFromProperties);
    },
    methods: {
        initFromProperties() {
            if (this.entity) {
                initPropertiesFromSource<Permission>(this.entity, this.form);
            }
        },
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
            ilingo: useAuthIlingo(),
            title: 'ID',
            propName: 'id',
        });

        const submit = buildFormSubmit(this, h, {
            updateText: 'Update',
            createText: 'Create',
        });

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
