/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { PropType } from 'vue';
import {
    helpers, maxLength, minLength,
} from 'vuelidate/lib/validators';
import { Robot } from '@typescript-auth/domains';
import {
    createNanoID,
} from '../../../utils';
import { ComponentFormData } from '../../type';

const validId = helpers.regex('validId', /^[a-zA-Z0-9_-]*$/);

type Properties = {
    [key: string]: any;

    name?: string,
    entity?: Robot
};

// Data, Methods, Computed, Props
export const RobotForm = Vue.extend<
ComponentFormData<Robot>,
any,
any,
Properties
>({
    name: 'RobotForm',
    props: {
        name: {
            type: String,
            default: undefined,
        },
        entity: {
            type: Object as PropType<Robot>,
            default: undefined,
        },
    },
    data() {
        return {
            form: {
                name: '',
                secret: '',
            },
            item: null,
            busy: false,
            loaded: false,

            secretChange: false,
        };
    },
    validations: {
        form: {
            name: {
                validId,
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
            secret: {
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
        },
    },
    computed: {
        nameFixed() {
            return !!this.name && this.name.length > 0;
        },
        isEditing() {
            return this.item &&
                Object.prototype.hasOwnProperty.call(this.item, 'id');
        },
        isSecretEmpty() {
            return !this.form.secret || this.form.secret.length === 0;
        },
        isSecretHashed() {
            return this.item &&
                this.item.secret === this.form.secret &&
                this.form.secret.startsWith('$');
        },
        updatedAt() {
            return this.entity ? this.entity.updated_at : undefined;
        },
    },
    watch: {
        updatedAt(val, oldVal) {
            if (val && val !== oldVal) {
                this.initFromEntityProperties();
                this.initFromProperties();
            }
        },
    },
    created() {
        Promise.resolve()
            .then(this.initFromEntityProperties)
            .then(this.find)
            .then(this.initFromProperties);
    },
    methods: {
        initFromEntityProperties() {
            if (!this.entity) return;

            if (this.item) {
                const keys = Object.keys(this.entity);
                for (let i = 0; i < keys.length; i++) {
                    this.item[keys[i]] = this.entity[keys[i]];
                }
            } else {
                this.item = this.entity;
            }

            this.loaded = true;
        },
        initFromProperties() {
            if (this.name) {
                this.form.name = this.name;
            }

            if (this.item) {
                const keys = Object.keys(this.form);
                for (let i = 0; i < keys.length; i++) {
                    if (Object.prototype.hasOwnProperty.call(this.item, keys[i])) {
                        this.form[keys[i]] = this.item[keys[i]];
                    }
                }
            }

            if (this.form.secret.length === 0) {
                this.generateSecret();
            }
        },
        generateSecret() {
            this.form.secret = createNanoID('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_!.', 64);
        },
        async find() {
            if (this.busy || !this.nameFixed || this.item) {
                this.loaded = true;
                return;
            }

            this.busy = true;

            try {
                const { data, meta } = await this.$authApi.robot.getMany({
                    filter: {
                        name: this.name,
                    },
                    fields: ['+secret'],
                });

                if (meta.total === 1) {
                    // eslint-disable-next-line prefer-destructuring
                    this.item = data[0];
                }
            } catch (e) {
                // ...
            }

            this.busy = false;
            this.loaded = true;
        },

        async save() {
            if (this.busy || this.$v.$invalid) return;

            this.busy = true;

            try {
                let response;

                if (this.isEditing) {
                    const { secret, ...form } = this.form;

                    response = await this.$authApi.robot.update(this.item.id, {
                        ...form,
                        ...(this.isSecretHashed || !this.secretChange ? { } : { secret }),
                    });

                    const keys = Object.keys(response);
                    for (let i = 0; i < keys.length; i++) {
                        this.item[keys[i]] = response[keys[i]];
                    }

                    this.$bvToast.toast('The robot was successfully updated.', {
                        variant: 'success',
                        toaster: 'b-toaster-top-center',
                    });

                    this.$emit('updated', response);
                } else {
                    response = await this.$authApi.robot.create({
                        ...this.form,
                    });

                    this.item = response;

                    this.$bvToast.toast('The robot was successfully created.', {
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
        async drop() {
            if (this.busy || !this.item) return;

            this.busy = true;

            try {
                const response = await this.$authApi.robot.delete(this.item.id);
                this.item = null;
                this.$emit('deleted', response);
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
        close() {
            this.$emit('close');
        },
        handleSecretChanged() {
            this.secretHashed = this.item && this.form.secret === this.item.secret;
        },
    },
    template: `
        <div>
            <p>
                Robot Credentials (ID & Secret) are required to authenticate and authorize against the API.
            </p>
            <hr>

            <template v-if="!loaded">
                <div class="text-center">
                    <div
                        class="spinner-border"
                        role="status"
                    >
                        <span class="sr-only">Loading...</span>
                    </div>
                </div>
            </template>
            <template v-else>
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
                        :disabled="nameFixed"
                        placeholder="..."
                    >

                    <div
                        v-if="!$v.form.name.validId"
                        class="form-group-hint group-required"
                    >
                        The name is only allowed to consist of the following characters: [0-9a-zA-Z_-]+
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
                        The length of the name must be less than <strong>{{ $v.form.name.$params.maxLength.max }}</strong> characters.
                    </div>
                </div>

                <hr>

                <template v-if="item">
                    <div class="form-group">
                        <label>ID</label>
                        <input
                            type="text"
                            class="form-control"
                            :disabled="true"
                            :value="item.id"
                        >
                    </div>
                </template>

                <hr>

                <b-form-checkbox
                    v-if="isEditing"
                    v-model="secretChange"
                    switch
                    size="sm"
                >
                    Change secret?
                </b-form-checkbox>

                <template v-if="!isEditing || secretChange">
                    <div
                        class="form-group"
                        :class="{ 'form-group-error': $v.form.secret.$error }"
                    >
                        <label>
                            Secret
                            <span
                                v-if="isSecretHashed"
                                class="text-danger font-weight-bold"
                            >Hashed <i class="fa fa-exclamation-triangle" />
                            </span>
                        </label>
                        <input
                            v-model="$v.form.secret.$model"
                            type="text"
                            name="secret"
                            class="form-control"
                            placeholder="..."
                            @change.prevent="handleSecretChanged"
                        >

                        <div
                            v-if="!$v.form.secret.minLength"
                            class="form-group-hint group-required"
                        >
                            The length of the secret must be greater than <strong>{{ $v.form.secret.$params.minLength.min }}</strong> characters.
                        </div>
                        <div
                            v-if="!$v.form.secret.maxLength"
                            class="form-group-hint group-required"
                        >
                            The length of the secret must be less than <strong>{{ $v.form.secret.$params.maxLength.max }}</strong> characters.
                        </div>
                    </div>
                    <div class="mb-1">
                        <button
                            class="btn btn-dark btn-xs"

                            @click.prevent="generateSecret"
                        >
                            <i class="fa fa-wrench" /> Generate
                        </button>
                    </div>

                    <div class="alert alert-warning">
                        The secret <i class="fa fa-key" /> is stored as <strong>hash</strong> in the database. Therefore, it is
                        not possible to inspect it after specification or generation.
                    </div>
                </template>

                <hr>

                <div class="d-flex flex-row">
                    <div>
                        <button
                            type="button"
                            class="btn btn-xs"
                            :class="{
                                'btn-dark': isEditing,
                                'btn-success': !isEditing
                            }"
                            :disabled="busy"
                            @click.prevent="save"
                        >
                            <i class="fa fa-save" /> {{ isEditing ? 'Save' : 'Create' }}
                        </button>
                    </div>
                    <div class="ml-auto">
                        <button
                            type="button"
                            class="btn btn-danger btn-xs"
                            :disabled="busy"
                            @click.prevent="drop"
                        >
                            <i class="fa fa-trash" /> Delete
                        </button>
                    </div>
                </div>
            </template>
        </div>
    `,
});
