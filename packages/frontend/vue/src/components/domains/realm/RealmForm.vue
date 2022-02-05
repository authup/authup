<!--
  Copyright (c) 2021-2021.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
  -->
<script>
import { createNanoID } from '@typescript-auth/domains';
import {
    helpers, maxLength, minLength, required,
} from 'vuelidate/lib/validators';

const validId = helpers.regex('validId', /^[a-z0-9-_]*$/);

export default {
    name: 'RealmForm',
    props: {
        entityProperty: {
            type: Object,
            default() {
                return {};
            },
        },
    },
    data() {
        return {
            formData: {
                id: '',
                name: '',
                description: '',
            },

            busy: false,
            message: null,
        };
    },
    validations: {
        formData: {
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
            return this.entityProperty &&
                Object.prototype.hasOwnProperty.call(this.entityProperty, 'id');
        },
        isIDEmpty() {
            return !this.formData.id || this.formData.id.length === 0;
        },
    },
    created() {
        this.initFromProperties();
    },
    methods: {
        initFromProperties() {
            if (this.entityProperty) {
                const keys = Object.keys(this.formData);
                for (let i = 0; i < keys.length; i++) {
                    if (Object.prototype.hasOwnProperty.call(this.entityProperty, keys[i])) {
                        this.formData[keys[i]] = this.entityProperty[keys[i]];
                    }
                }
            }

            if (this.formData.id.length === 0) {
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
                    response = await this.$authApi.realm.update(this.entityProperty.id, this.formData);

                    this.$bvToast.toast('The realm was successfully updated.', {
                        variant: 'success',
                        toaster: 'b-toaster-top-center',
                    });

                    this.$emit('updated', response);
                } else {
                    response = await this.$authApi.realm.create(this.formData);

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
            this.formData.id = createNanoID();
        },
    },
};
</script>
<template>
    <div>
        <div class="form-group">
            <div
                class="form-group"
                :class="{ 'form-group-error': $v.formData.id.$error }"
            >
                <label>ID</label>
                <input
                    v-model="$v.formData.id.$model"
                    type="text"
                    name="id"
                    class="form-control"
                    :disabled="isEditing"
                    placeholder="..."
                >

                <div
                    v-if="!$v.formData.id.required && !$v.formData.id.$model"
                    class="form-group-hint group-required"
                >
                    Enter an identifier.
                </div>
                <div
                    v-if="!$v.formData.id.validId"
                    class="form-group-hint group-required"
                >
                    The identifier is only allowed to consist of the following characters: [0-9a-z-_]+
                </div>
                <div
                    v-if="!$v.formData.id.minLength"
                    class="form-group-hint group-required"
                >
                    The length of the ID must be greater than <strong>{{ $v.formData.id.$params.minLength.min }}</strong> characters.
                </div>
                <div
                    v-if="!$v.formData.id.maxLength"
                    class="form-group-hint group-required"
                >
                    The length of the ID must be less than <strong>{{ $v.formData.id.$params.maxLength.max }}</strong> characters.
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
                :class="{ 'form-group-error': $v.formData.name.$error }"
            >
                <label>Name</label>
                <input
                    v-model="$v.formData.name.$model"
                    type="text"
                    name="name"
                    class="form-control"
                    placeholder="..."
                >

                <div
                    v-if="!$v.formData.name.required && !$v.formData.name.$model"
                    class="form-group-hint group-required"
                >
                    Enter a Name.
                </div>
                <div
                    v-if="!$v.formData.name.minLength"
                    class="form-group-hint group-required"
                >
                    The length of the name must be greater than <strong>{{ $v.formData.name.$params.minLength.min }}</strong> characters.
                </div>
                <div
                    v-if="!$v.formData.name.maxLength"
                    class="form-group-hint group-required"
                >
                    The length of the name must be less than <strong>{{ $v.formData.name.$params.maxLength.max }}</strong> characters.
                </div>
            </div>

            <hr>

            <div
                class="form-group"
                :class="{ 'form-group-error': $v.formData.description.$error }"
            >
                <label>Description</label>
                <textarea
                    v-model="$v.formData.description.$model"
                    class="form-control"
                    rows="4"
                    placeholder="..."
                />

                <div
                    v-if="!$v.formData.description.minLength"
                    class="form-group-hint group-required"
                >
                    The length of the description must be greater than
                    <strong>{{ $v.formData.description.$params.minLength.min }}</strong> characters.
                </div>
                <div
                    v-if="!$v.formData.description.maxLength"
                    class="form-group-hint group-required"
                >
                    The length of the description must be less than
                    <strong>{{ $v.formData.description.$params.maxLength.max }}</strong> characters.
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
    </div>
</template>
