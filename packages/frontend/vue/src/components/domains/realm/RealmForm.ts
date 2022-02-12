/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import {
    helpers, maxLength, minLength, required,
} from 'vuelidate/lib/validators';
import Vue, { PropType } from 'vue';
import { Realm } from '@typescript-auth/domains';
import { createNanoID } from '../../../utils';
import { ComponentFormData } from '../../type';

const validId = helpers.regex('validId', /^[a-z0-9-_]*$/);

type Properties = {
    entity?: Realm,
};

export const RealmForm = Vue.extend<
ComponentFormData<Realm>,
any,
any,
Properties
>({
    name: 'RealmForm',
    props: {
        entity: {
            type: Object as PropType<Realm>,
            required: false,
            default: undefined,
        },
    },
    data() {
        return {
            form: {
                id: '',
                name: '',
                description: '',
            },

            busy: false,
            message: null,
        };
    },
    validations: {
        form: {
            id: {
                required,
                validId,
                minLength: minLength(5),
                maxLength: maxLength(36),
            },
            name: {
                required,
                minLength: minLength(5),
                maxLength: maxLength(100),
            },
            description: {
                minLength: minLength(5),
                maxLength: maxLength(4096),
            },
        },
    },
    computed: {
        isEditing() {
            return this.entity &&
                Object.prototype.hasOwnProperty.call(this.entity, 'id');
        },
        isIDEmpty() {
            return !this.form.id || this.form.id.length === 0;
        },
    },
    created() {
        this.initFromProperties();
    },
    methods: {
        initFromProperties() {
            if (this.entity) {
                const keys = Object.keys(this.form);
                for (let i = 0; i < keys.length; i++) {
                    if (Object.prototype.hasOwnProperty.call(this.entity, keys[i])) {
                        this.form[keys[i]] = this.entity[keys[i]];
                    }
                }
            }

            if (this.form.id.length === 0) {
                this.generateID();
            }
        },
        async submit() {
            if (this.busy || this.$v.$invalid) {
                return;
            }

            this.busy = true;

            try {
                let response;
                if (this.isEditing) {
                    response = await this.$authApi.realm.update(this.entity.id, this.form);

                    this.$bvToast.toast('The realm was successfully updated.', {
                        variant: 'success',
                        toaster: 'b-toaster-top-center',
                    });

                    this.$emit('updated', response);
                } else {
                    response = await this.$authApi.realm.create(this.form);

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
            this.form.id = createNanoID();
        },
    },
    template: `
        <div>
            <div class="form-group">
                <div
                    class="form-group"
                    :class="{ 'form-group-error': $v.form.id.$error }"
                >
                    <label>ID</label>
                    <input
                        v-model="$v.form.id.$model"
                        type="text"
                        name="id"
                        class="form-control"
                        :disabled="isEditing"
                        placeholder="..."
                    >

                    <div
                        v-if="!$v.form.id.required && !$v.form.id.$model"
                        class="form-group-hint group-required"
                    >
                        Enter an identifier.
                    </div>
                    <div
                        v-if="!$v.form.id.validId"
                        class="form-group-hint group-required"
                    >
                        The identifier is only allowed to consist of the following characters: [0-9a-z-_]+
                    </div>
                    <div
                        v-if="!$v.form.id.minLength"
                        class="form-group-hint group-required"
                    >
                        The length of the ID must be greater than <strong>{{ $v.form.id.$params.minLength.min }}</strong> characters.
                    </div>
                    <div
                        v-if="!$v.form.id.maxLength"
                        class="form-group-hint group-required"
                    >
                        The length of the ID must be less than <strong>{{ $v.form.id.$params.maxLength.max }}</strong> characters.
                    </div>
                </div>
                <div
                    v-if="!isEditing"
                    class="alert alert-sm"
                    :class="{
                            'alert-warning': isIDEmpty,
                            'alert-success': !isIDEmpty
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

                <hr>

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
                        placeholder="..."
                    >

                    <div
                        v-if="!$v.form.name.required && !$v.form.name.$model"
                        class="form-group-hint group-required"
                    >
                        Enter a Name.
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

                <div
                    class="form-group"
                    :class="{ 'form-group-error': $v.form.description.$error }"
                >
                    <label>Description</label>
                    <textarea
                        v-model="$v.form.description.$model"
                        class="form-control"
                        rows="4"
                        placeholder="..."
                    />

                    <div
                        v-if="!$v.form.description.minLength"
                        class="form-group-hint group-required"
                    >
                        The length of the description must be greater than
                        <strong>{{ $v.form.description.$params.minLength.min }}</strong> characters.
                    </div>
                    <div
                        v-if="!$v.form.description.maxLength"
                        class="form-group-hint group-required"
                    >
                        The length of the description must be less than
                        <strong>{{ $v.form.description.$params.maxLength.max }}</strong> characters.
                    </div>
                </div>

                <hr>

                <div class="form-group">
                    <button
                        type="submit"
                        class="btn btn-outline-primary btn-sm"
                        :disabled="$v.$invalid || busy"
                        @click.prevent="submit"
                    >
                        {{ isEditing ? 'Update' : 'Create' }}
                    </button>
                </div>
            </div>
        </div>`,
});
