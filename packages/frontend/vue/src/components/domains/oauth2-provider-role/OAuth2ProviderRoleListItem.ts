/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { maxLength, minLength, required } from 'vuelidate/lib/validators';
import Vue, { CreateElement, PropType, VNode } from 'vue';
import { OAuth2ProviderRole, Role } from '@authelion/common';
import { ComponentFormData, buildFormInput } from '@vue-layout/utils';
import { useHTTPClient } from '../../../utils';

export type OAuth2ProviderRoleListItemProperties = {
    [key: string]: any;

    role: Role,
    entityId: string
};

export const OAuth2ProviderRoleListItem = Vue.extend<
ComponentFormData<OAuth2ProviderRole>,
any,
any,
OAuth2ProviderRoleListItemProperties
>({
    name: 'OAuth2ProviderRoleListItem',
    props: {
        role: {
            type: Object as PropType<Role>,
            required: true,
        },
        entityId: {
            type: String,
            required: true,
        },
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
                const { data } = await useHTTPClient().oauth2ProviderRole.getMany({
                    filter: {
                        role_id: this.role.id,
                        provider_id: this.entityId,
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
                    response = await useHTTPClient().oauth2ProviderRole.update(this.item.id, {
                        ...this.form,
                    });

                    this.$emit('updated', response);
                } else {
                    response = await useHTTPClient().oauth2ProviderRole.create({
                        ...this.form,
                        role_id: this.role.id,
                        provider_id: this.entityId,
                    });

                    this.item = response;

                    this.$emit('created', response);
                }
            } catch (e) {
                if (e instanceof Error) {
                    this.$emit('failed', e);
                }
            }

            this.busy = false;
        },
        async drop() {
            if (this.busy || !this.item) return;

            this.busy = true;

            try {
                const response = await useHTTPClient().oauth2ProviderRole.delete(this.item.id);

                this.item = null;

                this.$emit('deleted', response);
            } catch (e) {
                if (e instanceof Error) {
                    this.$emit('failed', e);
                }
            }

            this.busy = false;
        },

        toggleDisplay() {
            if (!this.loaded) return;

            this.display = !this.display;
        },
    },
    render(createElement: CreateElement): VNode {
        const vm = this;
        const h = createElement;

        let displayButton = h();

        if (vm.loaded) {
            displayButton = h('button', {
                staticClass: 'btn btn-xs btn-dark',
                on: {
                    click($event: any) {
                        $event.preventDefault();

                        vm.toggleDisplay.call(null);
                    },
                },
            }, [
                h('i', {
                    staticClass: 'fa',
                    class: {
                        'fa-chevron-down': !vm.display,
                        'fa-chevron-up': vm.display,
                    },
                }),
            ]);
        }

        let itemActions = h();

        if (vm.loaded) {
            let dropAction = h();

            if (vm.item) {
                dropAction = h('button', {
                    staticClass: 'btn btn-xs btn-danger',
                    attrs: {
                        disabled: vm.$v.$invalid || vm.busy,
                    },
                    domProps: {
                        disabled: vm.$v.$invalid || vm.busy,
                    },
                    on: {
                        click($event: any) {
                            $event.preventDefault();

                            return vm.drop.call(null);
                        },
                    },
                }, [
                    h('i', {
                        staticClass: 'fa',
                        class: {
                            'fa-plus': !vm.item,
                            'fa-save': vm.item,
                        },
                    }),
                ]);
            }

            itemActions = h('div', {
                staticClass: 'ml-auto',
            }, [
                h('button', {
                    staticClass: 'btn btn-xs',
                    class: {
                        'btn-primary': !vm.item,
                        'btn-dark': !!vm.item,
                    },
                    on: {
                        click($event: any) {
                            $event.preventDefault();

                            return vm.submit.call(null);
                        },
                    },
                }, [
                    h('i', {
                        staticClass: 'fa',
                        class: {
                            'fa-plus': !vm.item,
                            'fa-save': vm.item,
                        },
                    }),
                ]),
                dropAction,
            ]);
        }

        const listBar = h('div', {
            staticClass: 'd-flex flex-row',
        }, [
            h('div', {
                staticClass: 'mr-2',
            }, [
                displayButton,
            ]),
            h('div', [
                h('h6', {
                    staticClass: 'mb-0',
                    on: {
                        click($event: any) {
                            $event.preventDefault();

                            if (vm.loaded) {
                                vm.toggleDisplay.call(null);
                            }
                        },
                    },
                }, [vm.role.name]),
            ]),
            itemActions,
        ]);

        let form = h();

        if (vm.display) {
            form = h('div', {
                staticClass: 'mt-2',
            }, [
                buildFormInput(vm, h, {
                    title: 'External ID',
                    propName: 'external_id',
                }),
            ]);
        }

        return h('div', { staticClass: 'list-item flex-column' }, [
            listBar,
            form,
        ]);
    },
});

export default OAuth2ProviderRoleListItem;
