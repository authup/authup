/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { PropType } from 'vue';
import { maxLength, minLength, required } from 'vuelidate/lib/validators';
import { Role } from '@typescript-auth/domains';
import { ComponentFormData } from '../../type';

type Properties = {
    entity?: Partial<Role>
};

export const RoleForm = Vue.extend<
ComponentFormData<Role>,
any,
any,
Properties
>({
    name: 'RoleForm',
    props: {
        entity: {
            type: Object as PropType<Role>,
            default: undefined,
        },
    },
    data() {
        return {
            form: {
                name: '',
            },

            busy: false,
            message: null,
        };
    },
    validations: {
        form: {
            name: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(30),
            },
        },
    },
    computed: {
        isEditing() {
            return this.entity &&
                Object.prototype.hasOwnProperty.call(this.entity, 'id');
        },
    },
    created() {
        if (this.isEditing) {
            this.form.name = this.entity.name || '';
        }
    },
    methods: {
        async handleSubmit(e) {
            e.preventDefault();

            if (this.busy || this.$v.$invalid) {
                return;
            }

            this.message = null;
            this.busy = true;

            try {
                let response;

                if (this.isEditing) {
                    response = await this.$authApi.role.update(this.entity.id, this.form);

                    this.$bvToast.toast('The role was successfully updated.', {
                        variant: 'success',
                        toaster: 'b-toaster-top-center',
                    });

                    this.$emit('updated', response);
                } else {
                    response = await this.$authApi.role.create(this.form);

                    this.$bvToast.toast('The realm was successfully created.', {
                        variant: 'success',
                        toaster: 'b-toaster-top-center',
                    });

                    this.$emit('created', response);
                }
            } catch (e) {
                if (e instanceof Error) {
                    this.$bvToast.toast(e.message, {
                        variant: 'warning',
                        toaster: 'b-toaster-top-center',
                    });

                    this.$emit('failed', e);
                }
            }

            this.busy = false;
        },
    },
    template: `
        <div>
            <div class="form-group">
                <div
                    class="form-group"
                    :class="{ 'form-group-error': $v.form.name.$error }"
                >
                    <label>Name</label>
                    <input
                        v-model="$v.form.name.$model"
                        type="text"
                        name="name"
                        class="form-control"
                        placeholder="Name..."
                    >

                    <div
                        v-if="!$v.form.name.required"
                        class="form-group-hint group-required"
                    >
                        Enter a name
                    </div>
                    <div
                        v-if="!$v.form.name.minLength"
                        class="form-group-hint group-required"
                    >
                        The length of the name must be greater than <strong>{{ $v.form.name.$params.minLength.min }}</strong> characters
                    </div>
                    <div
                        v-if="!$v.form.name.maxLength"
                        class="form-group-hint group-required"
                    >
                        The length of the name must be greater than <strong>{{ $v.form.name.$params.maxLength.max }}</strong> characters.
                    </div>
                </div>

                <hr>

                <div class="form-group">
                    <button
                        type="submit"
                        class="btn btn-outline-primary btn-sm"
                        :disabled="$v.$invalid || busy"
                        @click="handleSubmit"
                    >
                        {{ isEditing ? 'Update' : 'Create' }}
                    </button>
                </div>
            </div>
        </div>
    `,
});
