<script>
import { maxLength, minLength, required } from 'vuelidate/lib/validators';

export default {
    name: 'OAuth2ProviderRoleListItem',
    props: {
        items: {
            type: Array,
            default: () => [],
        },
        role: Object,
        providerId: String,
    },
    data() {
        return {
            busy: false,
            resolved: false,

            item: null,

            formData: {
                external_id: '',
            },

            display: false,
        };
    },
    validations() {
        return {
            formData: {
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
            return this.formData.external_id && this.formData.external_id.length > 0;
        },
    },
    created() {
        Promise.resolve()
            .then(this.resolve)
            .then(this.initFromProperties)
            .then(() => {
                if (!this.isExternalIDDefined) {
                    this.formData.external_id = this.role.name;
                }
            });
    },
    methods: {
        initFromProperties() {
            if (!this.item) return;

            const keys = Object.keys(this.formData);
            for (let i = 0; i < keys.length; i++) {
                if (Object.prototype.hasOwnProperty.call(this.item, keys[i])) {
                    this.formData[keys[i]] = this.item[keys[i]];
                }
            }
        },
        async resolve() {
            if (this.busy && this.resolved) return;

            this.resolved = false;

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
            this.resolved = true;
        },
        async submit() {
            if (this.busy || this.$v.$invalid) return;

            this.busy = true;

            try {
                let response;

                if (this.item) {
                    response = await this.$authApi.oauth2ProviderRole.update(this.item.id, {
                        ...this.formData,
                    });

                    this.$bvToast.toast('The provider-role was successfully updated.', {
                        variant: 'success',
                        toaster: 'b-toaster-top-center',
                    });

                    this.$emit('updated', response);
                } else {
                    response = await this.$authApi.oauth2ProviderRole.create({
                        ...this.formData,
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
                this.$bvToast.toast(e.warning, {
                    variant: 'danger',
                    toaster: 'b-toaster-top-center',
                });

                this.$emit('failed', e);
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
            if (!this.resolved) return;

            this.display = !this.display;
        },
    },
};
</script>
<template>
    <div class="mb-2">
        <div
            class="provider-role-list-bar d-flex flex-row"
        >
            <div class="mr-2">
                <button
                    v-if="resolved"
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
                    v-if="resolved"
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
                    v-if="resolved && item"
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
                    :class="{ 'form-group-error': $v.formData.external_id.$error }"
                >
                    <label>External ID</label>
                    <input
                        v-model="$v.formData.external_id.$model"
                        type="text"
                        class="form-control"
                        placeholder="..."
                    >

                    <div
                        v-if="!$v.formData.external_id.required && !$v.formData.external_id.$model"
                        class="form-group-hint group-required"
                    >
                        Enter an external ID.
                    </div>

                    <div
                        v-if="!$v.formData.external_id.minLength"
                        class="form-group-hint group-required"
                    >
                        The length of the external ID must be greater than
                        <strong>{{ $v.formData.external_id.$params.minLength.min }}</strong> characters.
                    </div>
                    <div
                        v-if="!$v.formData.external_id.maxLength"
                        class="form-group-hint group-required"
                    >
                        The length of the external ID must be less than
                        <strong>{{ $v.formData.external_id.$params.maxLength.max }}</strong> characters.
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
<style>
.provider-role-list-bar {
    background-color: #ececec;
    border: 1px solid #dedede;
    box-shadow: 0 4px 25px 0 rgb(0 0 0 / 10%);
    transition: all .3s ease-in-out;
    border-radius: 4px;
    padding: 0.5rem 1rem;
}

.provider-role-list-bar h6 {
    cursor: pointer;
}
</style>
