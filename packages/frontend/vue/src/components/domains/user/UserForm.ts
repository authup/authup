/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    email, maxLength, minLength, required,
} from 'vuelidate/lib/validators';
import Vue, { PropType } from 'vue';

import { User } from '@typescript-auth/domains';
import { ComponentFormData } from '../../type';

export type Properties = {
    [key: string]: any;

    entity?: Partial<User>,
    realmId?: string
};

type Data = {
    displayNameChanged: boolean,

} & ComponentFormData<User>;

export const UserForm = Vue.extend<Data, any, any, Properties>({
    name: 'UserForm',
    props: {
        entity: {
            type: Object as PropType<Partial<User>>,
            default: undefined,
        },
        realmId: {
            type: String,
            default: undefined,
        },
    },
    data() {
        return {
            form: {
                name: '',
                display_name: '',
                email: '',
                realm_id: '',
            },

            busy: false,

            displayNameChanged: false,
        };
    },
    validations: {
        form: {
            name: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
            display_name: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
            email: {
                minLength: minLength(5),
                maxLength: maxLength(255),
                email,
            },
            realm_id: {
                required,
            },
        },
    },
    computed: {
        isRealmPredefined() {
            return typeof this.realmId !== 'undefined';
        },
        isEditing() {
            return typeof this.entity !== 'undefined' &&
                Object.prototype.hasOwnProperty.call(this.entity, 'id');
        },
        isNameLocked() {
            if (!this.entity) {
                return false;
            }

            return !!this.entity.name_locked;
        },
    },
    created() {
        if (typeof this.realmId !== 'undefined') {
            this.form.realm_id = this.realmId;
        }

        const keys = Object.keys(this.form);
        if (typeof this.entity !== 'undefined') {
            for (let i = 0; i < keys.length; i++) {
                if (Object.prototype.hasOwnProperty.call(this.entity, keys[i])) {
                    this.form[keys[i]] = this.entity[keys[i]];
                }
            }
        }
    },
    methods: {
        getModifiedFields() {
            if (typeof this.entity === 'undefined') {
                return Object.keys(this.form);
            }

            const fields : (keyof User)[] = [];

            const keys : (keyof User)[] = Object.keys(this.form) as (keyof User)[];

            for (let i = 0; i < keys.length; i++) {
                if (
                    Object.prototype.hasOwnProperty.call(this.form, keys[i]) &&
                    this.entity[keys[i]] !== this.form[keys[i]]
                ) {
                    fields.push(keys[i]);
                }
            }

            return fields;
        },
        async submit() {
            if (this.busy) {
                return;
            }

            this.busy = true;

            try {
                const fields = this.getModifiedFields();

                if (fields.length > 0) {
                    const properties : Record<string, any> = {};

                    for (let i = 0; i < fields.length; i++) {
                        properties[fields[i]] = this.form[fields[i]];
                    }

                    if (this.isEditing) {
                        const user = await this.$authApi.user.update(this.entity.id, { ...properties });

                        this.$bvToast.toast('The user was successfully updated.', {
                            variant: 'success',
                            toaster: 'b-toaster-top-center',
                        });

                        this.$emit('updated', user);
                    } else {
                        const user = await this.$authApi.user.create(properties);

                        this.$bvToast.toast('The realm was successfully created.', {
                            variant: 'success',
                            toaster: 'b-toaster-top-center',
                        });

                        this.$emit('created', user);
                    }
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
        updateDisplayName(e: Event) {
            if (!this.displayNameChanged) {
                this.form.display_name = (e.target as HTMLInputElement).value;
            }
        },
        handleDisplayNameChanged(e: Event) {
            this.displayNameChanged = (e.target as HTMLInputElement).value.length !== 0;
        },
    },
    template: `
        <div>
            <form @submit.prevent="submit">
                <div
                    v-if="!isRealmPredefined"
                    class="form-group"
                    :class="{ 'form-group-error': $v.form.realm_id.$error }"
                >
                    <label>Realm</label>

                    <realm-list>
                        <template #items="props">
                            <select
                                v-model="$v.form.realm_id.$model"
                                class="form-control"
                                :disabled="props.busy"
                            >
                                <option value="">
                                    --- Select ---
                                </option>
                                <option
                                    v-for="(item,key) in props.items"
                                    :key="key"
                                    :value="item.id"
                                >
                                    {{ item.name }}
                                </option>
                            </select>
                        </template>
                    </realm-list>


                    <div
                        v-if="!$v.form.realm_id.required && !$v.form.realm_id.$model"
                        class="form-group-hint group-required"
                    >
                        Please select a realm.
                    </div>
                </div>

                <div
                    class="form-group"
                    :class="{ 'form-group-error': $v.form.name.$error }"
                >
                    <label>Name</label>
                    <input
                        v-model="$v.form.name.$model"
                        :disabled="isNameLocked"
                        type="text"
                        name="name"
                        class="form-control"
                        placeholder="..."
                        @change.prevent="updateDisplayName"
                    >

                    <div
                        v-if="!$v.form.name.required && !$v.form.name.$model"
                        class="form-group-hint group-required"
                    >
                        Please enter a name.
                    </div>
                    <div
                        v-if="!$v.form.name.minLength"
                        class="form-group-hint group-required"
                    >
                        The length of the name must be less than <strong>{{ $v.form.name.$params.minLength.min }}</strong> characters.
                    </div>
                    <div
                        v-if="!$v.form.name.maxLength"
                        class="form-group-hint group-required"
                    >
                        The length of the name must be greater than <strong>{{ $v.form.name.$params.maxLength.max }}</strong> characters.
                    </div>
                </div>

                <div
                    class="form-group"
                    :class="{ 'form-group-error': $v.form.display_name.$error }"
                >
                    <label>Display Name</label>
                    <input
                        v-model="$v.form.display_name.$model"
                        type="text"
                        name="display_name"
                        class="form-control"
                        placeholder="..."
                        @change.prevent="handleDisplayNameChanged"
                    >

                    <div
                        v-if="!$v.form.display_name.required && !$v.form.display_name.$model"
                        class="form-group-hint group-required"
                    >
                        Please enter a display name.
                    </div>
                    <div
                        v-if="!$v.form.display_name.minLength"
                        class="form-group-hint group-required"
                    >
                        The length of the display name must be less than <strong>{{ $v.form.display_name.$params.minLength.min }}</strong> characters.
                    </div>
                    <div
                        v-if="!$v.form.display_name.maxLength"
                        class="form-group-hint group-required"
                    >
                        The length of the display name must be greater than  <strong>{{ $v.form.display_name.$params.maxLength.max }}</strong> characters.
                    </div>
                </div>

                <div
                    class="form-group"
                    :class="{ 'form-group-error': $v.form.email.$error }"
                >
                    <label>Email</label>
                    <input
                        v-model="$v.form.email.$model"
                        type="email"
                        name="email"
                        class="form-control"
                        placeholder="..."
                    >

                    <div
                        v-if="!$v.form.email.minLength"
                        class="form-group-hint group-required"
                    >
                        The length of the e-mail address must be less than  <strong>{{ $v.form.email.$params.minLength.min }}</strong> characters.
                    </div>
                    <div
                        v-if="!$v.form.email.maxLength"
                        class="form-group-hint group-required"
                    >
                        The length of the e-mail address must be greater than  <strong>{{ $v.form.email.$params.maxLength.max }}</strong> characters.
                    </div>
                    <div
                        v-if="!$v.form.email.email"
                        class="form-group-hint group-required"
                    >
                        The e-mail address is not valid.
                    </div>
                </div>

                <div class="form-group">
                    <button
                        :disabled="$v.form.$invalid || busy"
                        type="submit"
                        class="btn btn-primary btn-xs"
                        @click.prevent="submit"
                    >
                        <i :class="{'fa fa-save': isEditing, 'fa fa-plus': !isEditing}" />
                        {{ isEditing ? 'Update' : 'Create' }}
                    </button>
                </div>
            </form>
        </div>
    `,
});

export default UserForm;
