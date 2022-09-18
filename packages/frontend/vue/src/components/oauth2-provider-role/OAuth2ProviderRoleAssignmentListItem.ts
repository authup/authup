/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import useVuelidate from '@vuelidate/core';
import { maxLength, minLength, required } from '@vuelidate/validators';
import {
    PropType, VNodeArrayChildren, computed, defineComponent, h, reactive, ref,
} from 'vue';
import { IdentityProviderRole, Role } from '@authelion/common';
import { buildFormInput } from '@vue-layout/utils';
import { initFormAttributesFromEntity } from '../../composables/form';
import { buildVuelidateTranslator } from '../../language/utils';
import { useHTTPClient } from '../../utils';

export const OAuth2ProviderRoleAssignmentListItem = defineComponent({
    name: 'OAuth2ProviderRoleAssignmentListItem',
    props: {
        role: {
            type: Object as PropType<Role>,
            required: true,
        },
        entityId: {
            type: String,
            required: true,
        },
        translatorLocale: {
            type: String,
            default: undefined,
        },
    },
    emits: ['created', 'deleted', 'updated', 'failed'],
    setup(props, ctx) {
        const busy = ref(false);
        const loaded = ref(false);
        const display = ref(false);
        const toggleDisplay = () => {
            if (!loaded.value) return;

            display.value = !display.value;
        };

        const item = ref<IdentityProviderRole | null>(null);

        const form = reactive({
            external_id: '',
        });

        const $v = useVuelidate({
            external_id: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
        }, form);

        const isExternalIDDefined = computed(() => form.external_id && form.external_id.length > 0);

        const submit = async () => {
            if (busy.value || $v.value.$invalid) return;

            busy.value = true;

            try {
                let response;

                if (item.value) {
                    response = await useHTTPClient().identityProviderRole.update(item.value.id, {
                        ...form,
                    });

                    ctx.emit('updated', response);
                } else {
                    response = await useHTTPClient().identityProviderRole.create({
                        ...form,
                        role_id: props.role.id,
                        provider_id: props.entityId,
                    });

                    item.value = response;

                    ctx.emit('created', response);
                }
            } catch (e) {
                if (e instanceof Error) {
                    ctx.emit('failed', e);
                }
            }

            busy.value = false;
        };

        const drop = async () => {
            if (busy.value || !item.value) return;

            busy.value = true;

            try {
                const response = await useHTTPClient().identityProviderRole.delete(item.value.id);

                item.value = null;

                ctx.emit('deleted', response);
            } catch (e) {
                if (e instanceof Error) {
                    ctx.emit('failed', e);
                }
            }

            busy.value = false;
        };

        Promise.resolve()
            .then(async () => {
                if (busy.value && loaded.value) return;

                loaded.value = false;

                try {
                    const { data } = await useHTTPClient().identityProviderRole.getMany({
                        filter: {
                            role_id: props.role.id,
                            provider_id: props.entityId,
                        },
                    });

                    if (data.length === 1) {
                        // eslint-disable-next-line prefer-destructuring
                        item.value = data[0];

                        initFormAttributesFromEntity(form, data[0]);
                        if (!isExternalIDDefined.value) {
                            form.external_id = props.role.name;
                        }
                    } else {
                        item.value = null;
                    }
                } catch (e) {
                    // ...
                }

                busy.value = false;
                loaded.value = true;
            });

        const render = () => {
            let displayButton : VNodeArrayChildren = [];

            if (loaded.value) {
                displayButton = [h('button', {
                    class: 'btn btn-xs btn-dark',
                    onClick($event: any) {
                        $event.preventDefault();

                        toggleDisplay.call(null);
                    },
                }, [
                    h('i', {
                        class: ['fa', {
                            'fa-chevron-down': !display.value,
                            'fa-chevron-up': display.value,
                        }],
                    }),
                ])];
            }

            let itemActions;

            if (loaded.value) {
                let dropAction : VNodeArrayChildren = [];

                if (item.value) {
                    dropAction = [h('button', {
                        class: 'btn btn-xs btn-danger',
                        disabled: $v.value.$invalid || busy.value,
                        onClick($event: any) {
                            $event.preventDefault();

                            return drop.call(null);
                        },
                    }, [
                        h('i', {
                            class: ['fa', {
                                'fa-plus': !item.value,
                                'fa-save': item.value,
                            }],
                        }),
                    ])];
                }

                itemActions = h('div', {
                    class: 'ml-auto',
                }, [
                    h('button', {
                        class: ['btn btn-xs', {
                            'btn-primary': !item.value,
                            'btn-dark': !!item.value,
                        }],
                        onClick($event: any) {
                            $event.preventDefault();

                            return submit.call(null);
                        },
                    }, [
                        h('i', {
                            class: ['fa', {
                                'fa-plus': !item.value,
                                'fa-save': item.value,
                            }],
                        }),
                    ]),
                    dropAction,
                ]);
            }

            const listBar = h('div', {
                class: 'd-flex flex-row',
            }, [
                h('div', {
                    class: 'mr-2',
                }, [
                    displayButton,
                ]),
                h('div', [
                    h('h6', {
                        class: 'mb-0',
                        onClick($event: any) {
                            $event.preventDefault();

                            if (loaded.value) {
                                toggleDisplay.call(null);
                            }
                        },
                    }, [props.role.name]),
                ]),
                itemActions,
            ]);

            let renderForm : VNodeArrayChildren = [];

            if (display.value) {
                renderForm = [
                    h('div', {
                        class: 'mt-2',
                    }, [
                        buildFormInput({
                            labelContent: 'External ID',
                            value: form.external_id,
                            change(input) {
                                form.external_id = input;
                            },
                            validationResult: $v.value.external_id,
                            validationTranslator: buildVuelidateTranslator(props.translatorLocale),
                        }),
                    ]),
                ];
            }

            return h('div', { class: 'list-item flex-column' }, [
                listBar,
                renderForm,
            ]);
        };

        return () => render();
    },
});

export default OAuth2ProviderRoleAssignmentListItem;
