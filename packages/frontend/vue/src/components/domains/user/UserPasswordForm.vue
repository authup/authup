<!--
  Copyright (c) 2021-2021.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
  -->
<script>
import {
    maxLength, minLength, required, sameAs,
} from 'vuelidate/lib/validators';

export default {
    name: 'UserPasswordForm',
    props: {
        entityProperty: {
            type: Object,
            default: undefined,
        },
    },
    data() {
        return {
            form: {
                password: '',
                password_repeat: '',
                passwordShow: false,

                message: null,
                busy: false,
            },
            userData: null,
        };
    },
    validations: {
        form: {
            password: {
                required,
                minLength: minLength(5),
                maxLength: maxLength(100),
            },
            password_repeat: {
                required,
                minLength: minLength(5),
                maxLength: maxLength(100),
                sameAsPassword: sameAs('password'),
            },
        },
    },
    methods: {
        //---------------------------------------------------------------

        async submit() {
            if (this.form.busy) return;

            this.form.busy = true;

            try {
                const user = await this.$authApi.user.update(this.entityProperty.id, {
                    password: this.form.password,
                    password_repeat: this.form.password_repeat,
                });

                this.$bvToast.toast('The user password was successfully updated.', {
                    variant: 'success',
                    toaster: 'b-toaster-top-center',
                });

                this.$emit('updated', user);
            } catch (e) {
                if (e instanceof Error) {
                    this.$bvToast.toast(e.message, {
                        variant: 'warning',
                        toaster: 'b-toaster-top-center',
                    });

                    this.$emit('failed', e);
                }
            }

            this.form.busy = false;
        },
    },
};
</script>
<template>
    <form @submit.prevent="submit">
        <div
            class="form-group"
            :class="{ 'form-group-error': $v.form.password.$error }"
        >
            <label>Password</label>
            <input
                v-model="$v.form.password.$model"
                :type="form.passwordShow ? 'text' : 'password'"
                name="name"
                class="form-control"
                placeholder="..."
            >

            <div
                v-if="!$v.form.password.required"
                class="form-group-hint group-required"
            >
                Enter a password.
            </div>
            <div
                v-if="!$v.form.password.minLength"
                class="form-group-hint group-required"
            >
                The length of the password must be greater than <strong>{{ $v.form.password.$params.minLength.min }}</strong> characters.
            </div>
            <div
                v-if="!$v.form.password.maxLength"
                class="form-group-hint group-required"
            >
                The length of the password must be less than <strong>{{ $v.form.password.$params.maxLength.max }}</strong> characters.
            </div>
        </div>

        <div
            class="form-group"
            :class="{ 'form-group-error': $v.form.password_repeat.$error }"
        >
            <label>Repeat password</label>
            <input
                v-model="$v.form.password_repeat.$model"
                :type="form.passwordShow ? 'text' : 'password'"
                name="name"
                class="form-control"
                placeholder="..."
            >

            <div
                v-if="!$v.form.password_repeat.required"
                class="form-group-hint group-required"
            >
                Repeat the password from above.
            </div>
            <div
                v-if="!$v.form.password_repeat.minLength"
                class="form-group-hint group-required"
            >
                The length of the password must be greater than <strong>{{ $v.form.password_repeat.$params.minLength.min }}</strong> characters.
            </div>
            <div
                v-if="!$v.form.password_repeat.maxLength"
                class="form-group-hint group-required"
            >
                The length of the password must be less than <strong>{{ $v.form.password_repeat.$params.maxLength.max }}</strong> characters.
            </div>
            <div
                v-if="!$v.form.password_repeat.sameAsPassword"
                class="form-group-hint group-required"
            >
                The entered passwords are not the same.
            </div>
        </div>

        <div class="form-group pl-1 mb-1">
            <b-form-checkbox
                v-model="form.passwordShow"
                switch
            >
                Password {{ form.passwordShow ? 'hide' : 'show' }}
            </b-form-checkbox>
        </div>

        <hr>

        <div class="form-group">
            <button
                :disabled="$v.form.$invalid || form.busy"
                type="submit"
                class="btn btn-primary btn-xs"
                @click.prevent="submit"
            >
                <i class="fa fa-save" /> Update
            </button>
        </div>
    </form>
</template>
