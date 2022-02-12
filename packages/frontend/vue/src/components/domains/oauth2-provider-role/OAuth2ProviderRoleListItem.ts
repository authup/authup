/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { maxLength, minLength, required } from 'vuelidate/lib/validators';
import Vue, { PropType } from 'vue';
import { OAuth2ProviderRole, Role } from '@typescript-auth/domains';
import { ComponentFormData } from '../../type';

export type Properties = {
    [key: string]: any;

    role?: Role,
    providerId?: string
};

export const OAuth2ProviderRoleListItem = Vue.extend<
ComponentFormData<OAuth2ProviderRole>,
any,
any,
Properties
>({
    name: 'OAuth2ProviderRoleListItem',
    props: {
        role: Object as PropType<Role>,
        providerId: String,
    },
    data() {
        return {
            busy: false,
            loaded: false,

            item: null,

            form: {
                external_id: '',
            },

            display: false,
        };
    },
    validations() {
        return {
            form: {
                external_id: {
                    required,
                    minLength: minLength(3),
                    maxLength: maxLength(128),
                },
            },
        };
    },
    computed: {
        isExternalIDDefined() {
            return this.form.external_id && this.form.external_id.length > 0;
        },
    },
    created() {
        Promise.resolve()
            .then(this.resolve)
            .then(this.initFromProperties)
            .then(() => {
                if (!this.isExternalIDDefined) {
                    this.form.external_id = this.role.name;
                }
            });
    },
    methods: {
        initFromProperties() {
            if (!this.item) return;

            const keys = Object.keys(this.form);
            for (let i = 0; i < keys.length; i++) {
                if (Object.prototype.hasOwnProperty.call(this.item, keys[i])) {
                    this.form[keys[i]] = this.item[keys[i]];
                }
            }
        },
        async resolve() {
            if (this.busy && this.loaded) return;

            this.loaded = false;

            try {
                const { data } = await this.$authApi.oauth2ProviderRole.getMany({
                    filter: {
                        role_id: this.role.id,
                        provider_id: this.providerId,
                    },
                });

                if (data.length === 1) {
                    // eslint-disable-next-line prefer-destructuring
                    this.item = data[0];
                } else {
                    this.item = null;
                }
            } catch (e) {
                // ...
            }

            this.busy = false;
            this.loaded = true;
        },
        async submit() {
            if (this.busy || this.$v.$invalid) return;

            this.busy = true;

            try {
                let response;

                if (this.item) {
                    response = await this.$authApi.oauth2ProviderRole.update(this.item.id, {
                        ...this.form,
                    });

                    this.$bvToast.toast('The provider-role was successfully updated.', {
                        variant: 'success',
                        toaster: 'b-toaster-top-center',
                    });

                    this.$emit('updated', response);
                } else {
                    response = await this.$authApi.oauth2ProviderRole.create({
                        ...this.form,
                        role_id: this.role.id,
                        provider_id: this.providerId,
                    });

                    this.item = response;

                    this.$bvToast.toast('The provider-role was successfully created.', {
                        variant: 'success',
                        toaster: 'b-toaster-top-center',
                    });

                    this.$emit('created', response);
                }
            } catch (e) {
                if (e instanceof Error) {
                    this.$bvToast.toast(e.message, {
                        variant: 'danger',
                        toaster: 'b-toaster-top-center',
                    });

                    this.$emit('failed', e);
                }
            }

            this.busy = false;
        },
        async drop() {
            if (this.busy || !this.item) return;

            this.busy = true;

            try {
                const response = await this.$authApi.oauth2ProviderRole.delete(this.item.id);

                this.$bvToast.toast('The provider-role was successfully deleted.', {
                    variant: 'warning',
                    toaster: 'b-toaster-top-center',
                });

                this.item = null;

                this.$emit('deleted', response);
            } catch (e) {
                // ...
            }

            this.busy = false;
        },

        toggleDisplay() {
            if (!this.loaded) return;

            this.display = !this.display;
        },
    },
    template: `
        <div>
            <div
                class="provider-role-list-bar d-flex flex-row"
            >
                <div class="mr-2">
                    <button
                        v-if="loaded"
                        class="btn btn-xs btn-dark"
                        @click.prevent="toggleDisplay"
                    >
                        <i :class="{'fa fa-chevron-down': !display, 'fa fa-chevron-up': display}" />
                    </button>
                </div>
                <div>
                    <h6
                        class="mb-0"
                        @click.prevent="toggleDisplay"
                    >
                        {{ role.name }}
                    </h6>
                </div>
                <div class="ml-auto">
                    <button
                        v-if="loaded"
                        :class="{
                            'btn-primary': !item,
                            'btn-dark': !!item
                        }"
                        class="btn btn-xs"
                        @click.prevent="submit"
                    >
                        <i :class="{'fa fa-plus': !item, 'fa fa-save': item}" />
                    </button>
                    <button
                        v-if="loaded && item"
                        class="btn btn-xs btn-danger"
                        :disabled="$v.$invalid || busy"
                        @click.prevent="drop"
                    >
                        <i class="fa fa-trash" />
                    </button>
                </div>
            </div>

            <template v-if="display">
                <div class="mt-2">
                    <div
                        class="form-group"
                        :class="{ 'form-group-error': $v.form.external_id.$error }"
                    >
                        <label>External ID</label>
                        <input
                            v-model="$v.form.external_id.$model"
                            type="text"
                            class="form-control"
                            placeholder="..."
                        >

                        <div
                            v-if="!$v.form.external_id.required && !$v.form.external_id.$model"
                            class="form-group-hint group-required"
                        >
                            Enter an external ID.
                        </div>

                        <div
                            v-if="!$v.form.external_id.minLength"
                            class="form-group-hint group-required"
                        >
                            The length of the external ID must be greater than
                            <strong>{{ $v.form.external_id.$params.minLength.min }}</strong> characters.
                        </div>
                        <div
                            v-if="!$v.form.external_id.maxLength"
                            class="form-group-hint group-required"
                        >
                            The length of the external ID must be less than
                            <strong>{{ $v.form.external_id.$params.maxLength.max }}</strong> characters.
                        </div>
                    </div>
                </div>
            </template>
        </div>
    `,
});
