/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { PropType } from 'vue';
import { maxLength, minLength, required } from 'vuelidate/lib/validators';
import { OAuth2Provider } from '@typescript-auth/domains';
import { createNanoID, hasOwnProperty } from '../../../utils';
import { OAuth2ProviderRoleList } from '../oauth2-provider-role';
import { ComponentFormData } from '../../type';

type Properties = {
    [key: string]: any;

    entity?: OAuth2Provider,
    realmId?: string
};

export const OAuth2ProviderForm = Vue.extend<
ComponentFormData<OAuth2Provider>,
any,
any,
Properties
>({
    name: 'OAuth2ProviderForm',
    components: { OAuth2ProviderRoleList },
    props: {
        entity: {
            type: Object as PropType<OAuth2Provider>,
            required: false,
            default: undefined,
        },
        realmId: {
            type: String,
            default: null,
        },
    },
    data() {
        return {
            form: {
                name: '',
                open_id: false,
                token_host: '',
                token_path: '',
                authorize_host: '',
                authorize_path: '',
                scope: '',
                client_id: '',
                client_secret: '',
                realm_id: '',
            },

            schemes: [
                {
                    id: 'oauth2',
                    name: 'OAuth2',
                },
                {
                    id: 'openid',
                    name: 'Open ID',
                },
            ],
            realm: {
                items: [],
                busy: false,
            },

            busy: false,
        };
    },
    validations: {
        form: {
            name: {
                required,
                minLength: minLength(5),
                maxLength: maxLength(36),
            },
            open_id: {
                required,
            },
            token_host: {
                required,
                minLength: minLength(5),
                maxLength: maxLength(512),
            },
            token_path: {
                minLength: minLength(5),
                maxLength: maxLength(256),
            },
            authorize_host: {
                minLength: minLength(5),
                maxLength: maxLength(512),
            },
            authorize_path: {
                minLength: minLength(5),
                maxLength: maxLength(256),
            },
            scope: {
                minLength: minLength(3),
                maxLength: maxLength(512),
            },
            client_id: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
            client_secret: {
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
            realm_id: {
                required,
            },
        },
    },
    computed: {
        isEditing() {
            return this.entity &&
                Object.prototype.hasOwnProperty.call(this.entity, 'id');
        },
        isNameEmpty() {
            return !this.form.name || this.form.name.length === 0;
        },
    },
    created() {
        if (this.realmId) {
            this.form.realm_id = this.realmId;
        }

        // eslint-disable-next-line no-restricted-syntax
        for (const key in this.form) {
            if (hasOwnProperty(this.entity, key)) {
                this.form[key] = this.entity[key];
            }
        }

        if (this.isNameEmpty) {
            this.generateID();
        }

        Promise.resolve()
            .then(this.loadRealms);
    },
    methods: {
        async loadRealms() {
            this.realm.busy = true;

            try {
                const response = await this.$authApi.realm.getMany();
                this.realm.items = response.data;
                this.realm.busy = false;
            } catch (e) {
                this.realm.busy = false;
            }
        },
        async handleSubmit() {
            if (this.busy || this.$v.$invalid) {
                return;
            }

            this.busy = true;

            try {
                let response;

                if (this.isEditing) {
                    response = await this.$authApi.oauth2Provider.update(this.entity.id, this.form);

                    this.$bvToast.toast('The realm was successfully updated.', {
                        variant: 'success',
                        toaster: 'b-toaster-top-center',
                    });

                    this.$emit('updated', response);
                } else {
                    response = await this.$authApi.oauth2Provider.create(this.form);

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
        generateID() {
            this.form.name = createNanoID();
        },
    },
    template: `
        <div>
            <div class="row">
                <div class="col">
                    <h6><i class="fa fa-wrench" /> Configuration</h6>

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
                            v-if="!$v.form.name.required && !$v.form.name.$model"
                            class="form-group-hint group-required"
                        >
                            Provide a name for the entity.
                        </div>
                        <div
                            v-if="!$v.form.name.minLength"
                            class="form-group-hint group-required"
                        >
                            The length of the name must be greater than <strong>{{ $v.form.name.$params.minLength.min }}</strong> characters.
                        </div>
                        <div
                            v-if="!$v.form.name.maxLength"
                            class="form-group-hint group-required"
                        >
                            The length of the password must be less than <strong>{{ $v.form.name.$params.maxLength.max }}</strong> characters.
                        </div>
                    </div>
                    <div
                        class="alert alert-sm"
                        :class="{
                            'alert-warning': isNameEmpty,
                            'alert-success': !isNameEmpty
                        }"
                    >
                        <div class="mb-1">
                            If you don't want to chose an identifier by your own, you can generate one.
                        </div>
                        <button
                            class="btn btn-dark btn-xs"
                            @click.prevent="generateID"
                        >
                            <i class="fa fa-wrench" /> Generate
                        </button>
                    </div>

                    <div
                        v-if="!realmId"
                        class="form-group"
                        :class="{ 'form-group-error': $v.form.realm_id.$error }"
                    >
                        <label>Realm</label>

                        <select
                            v-model="$v.form.realm_id.$model"
                            class="form-control"
                        >
                            <option value="">
                                -- Bitte auswählen --
                            </option>
                            <option
                                v-for="(item,key) in realm.items"
                                :key="key"
                                :value="item.id"
                            >
                                {{ item.name }}
                            </option>
                        </select>

                        <div
                            v-if="!$v.form.realm_id.required && !$v.form.realm_id.$model"
                            class="form-group-hint group-required"
                        >
                            Please select a realm.
                        </div>
                    </div>

                    <div
                        class="form-group"
                        :class="{ 'form-group-error': $v.form.open_id.$error }"
                    >
                        <label>OpenID</label>
                        <div class="form-check">
                            <input
                                id="openIdEnabled"
                                v-model="$v.form.open_id.$model"
                                type="checkbox"
                                class="form-check-input"
                            >
                            <label
                                class="form-check-label"
                                for="openIdEnabled"
                            >Enabled?</label>
                        </div>

                        <div class="alert alert-info alert-sm mt-1">
                            If enabled the server will try to pull additional information from the authentication server.
                        </div>
                    </div>
                </div>
                <div class="col">
                    <h6><i class="fa fa-lock" /> Security</h6>

                    <div
                        class="form-group"
                        :class="{ 'form-group-error': $v.form.client_id.$error }"
                    >
                        <label>Client ID</label>
                        <input
                            v-model="$v.form.client_id.$model"
                            type="text"
                            name="name"
                            class="form-control"
                            placeholder="Name..."
                        >

                        <div
                            v-if="!$v.form.client_id.required && !$v.form.client_id.$model"
                            class="form-group-hint group-required"
                        >
                            Please enter a client id.
                        </div>
                        <div
                            v-if="!$v.form.client_id.minLength"
                            class="form-group-hint group-required"
                        >
                            The length of the client id must be greater than <strong>{{ $v.form.name.$params.minLength.min }}</strong> characters.
                        </div>
                        <div
                            v-if="!$v.form.client_id.maxLength"
                            class="form-group-hint group-required"
                        >
                            The length of the client id must be less than  <strong>{{ $v.form.name.$params.maxLength.max }}</strong> characters.
                        </div>
                    </div>

                    <div
                        class="form-group"
                        :class="{ 'form-group-error': $v.form.client_secret.$error }"
                    >
                        <label>Client Secret (optional)</label>
                        <input
                            v-model="$v.form.client_secret.$model"
                            type="text"
                            name="name"
                            class="form-control"
                            placeholder="Secret..."
                        >

                        <div
                            v-if="!$v.form.client_secret.minLength"
                            class="form-group-hint group-required"
                        >
                            The length of the client secret must be greater than
                            <strong>{{ $v.form.client_secret.$params.minLength.min }}</strong> characters.
                        </div>
                        <div
                            v-if="!$v.form.client_secret.maxLength"
                            class="form-group-hint group-required"
                        >
                            The length of the client secret must be less than
                            <strong>{{ $v.form.client_secret.$params.maxLength.max }}</strong> characters.
                        </div>
                    </div>
                </div>
            </div>

            <hr>

            <h6><i class="fas fa-link" /> URLs / Paths</h6>
            <div class="row">
                <div class="col">
                    <div
                        class="form-group"
                        :class="{ 'form-group-error': $v.form.token_host.$error }"
                    >
                        <label>Token Host</label>
                        <input
                            v-model="$v.form.token_host.$model"
                            type="text"
                            name="name"
                            class="form-control"
                            placeholder="https://..."
                        >

                        <div
                            v-if="!$v.form.token_host.required && !$v.form.token_host.$model"
                            class="form-group-hint group-required"
                        >
                            Please enter a token host.
                        </div>
                        <div
                            v-if="!$v.form.token_host.minLength"
                            class="form-group-hint group-required"
                        >
                            The length of the token host must be greater than
                            <strong>{{ $v.form.token_host.$params.minLength.min }}</strong> characters.
                        </div>
                        <div
                            v-if="!$v.form.token_host.maxLength"
                            class="form-group-hint group-required"
                        >
                            The length of the token host must be less than
                            <strong>{{ $v.form.token_host.$params.maxLength.max }}</strong> characters.
                        </div>
                    </div>

                    <div
                        class="form-group"
                        :class="{ 'form-group-error': $v.form.token_path.$error }"
                    >
                        <label>Token Path (optional) <small class="text-success">default: "oauth/token"</small></label>
                        <input
                            v-model="$v.form.token_path.$model"
                            type="text"
                            name="name"
                            class="form-control"
                            placeholder="path/..."
                        >

                        <div
                            v-if="!$v.form.token_path.minLength"
                            class="form-group-hint group-required"
                        >
                            The length of the token path must be greater than
                            <strong>{{ $v.form.token_path.$params.minLength.min }}</strong> characters.
                        </div>
                        <div
                            v-if="!$v.form.token_path.maxLength"
                            class="form-group-hint group-required"
                        >
                            The length of the password must be less than
                            <strong>{{ $v.form.token_path.$params.maxLength.max }}</strong> characters.
                        </div>
                    </div>
                </div>
                <div class="col">
                    <div
                        class="form-group"
                        :class="{ 'form-group-error': $v.form.authorize_host.$error }"
                    >
                        <label>Authorization Host (optional) <small class="text-success">default: Token Host</small></label>
                        <input
                            v-model="$v.form.authorize_host.$model"
                            type="text"
                            name="name"
                            class="form-control"
                            placeholder="https://..."
                        >

                        <div
                            v-if="!$v.form.authorize_host.minLength"
                            class="form-group-hint group-required"
                        >
                            The length of the authorization host must be greater than
                            <strong>{{ $v.form.token_host.$params.minLength.min }}</strong> characters.
                        </div>
                        <div
                            v-if="!$v.form.authorize_host.maxLength"
                            class="form-group-hint group-required"
                        >
                            The length of the authorization host must be less than
                            <strong>{{ $v.form.authorize_host.$params.maxLength.max }}</strong> characters.
                        </div>
                    </div>

                    <div
                        class="form-group"
                        :class="{ 'form-group-error': $v.form.authorize_path.$error }"
                    >
                        <label>Authorization Path (optional) <small class="text-success">
                            default: "oauth/authorize"
                        </small></label>
                        <input
                            v-model="$v.form.authorize_path.$model"
                            type="text"
                            name="name"
                            class="form-control"
                            placeholder="path/..."
                        >

                        <div
                            v-if="!$v.form.authorize_path.minLength"
                            class="form-group-hint group-required"
                        >
                            The length of the authorization path must be greater than
                            <strong>{{ $v.form.authorize_path.$params.minLength.min }}</strong> characters.
                        </div>
                        <div
                            v-if="!$v.form.authorize_path.maxLength"
                            class="form-group-hint group-required"
                        >
                            The length of the authorization path must be less than
                            <strong>{{ $v.form.authorize_path.$params.maxLength.max }}</strong> characters.
                        </div>
                    </div>
                </div>
            </div>

            <hr>

            <div v-if="isEditing">
                <h6><i class="fas fa-users" /> Roles</h6>

                <o-auth2-provider-role-list
                    :entity-id="entity.id"
                />
            </div>

            <hr>

            <div class="form-group">
                <button
                    type="submit"
                    class="btn btn-outline-primary btn-sm"
                    :disabled="$v.$invalid || busy"
                    @click.prevent="handleSubmit"
                >
                    {{ isEditing ? 'Update' : 'Create' }}
                </button>
            </div>
        </div>
    `,
});

export default OAuth2ProviderForm;
