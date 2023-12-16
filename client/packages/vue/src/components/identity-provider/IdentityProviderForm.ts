/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    defineComponent, h, ref, toRef,
} from 'vue';
import { IdentityProviderProtocol } from '@authup/core';
import type { IdentityProvider, IdentityProviderPreset } from '@authup/core';
import type { PropType, VNodeChild } from 'vue';
import { onChange, useUpdatedAt } from '../../composables';
import { IdentityProviderPicker } from './IdentityProviderPicker';
import { IdentityProviderOAuth2Form } from './IdentityProviderOAuth2Form';

export const IdentityProviderForm = defineComponent({
    props: {
        entity: {
            type: Object as PropType<IdentityProvider>,
        },
        realmId: {
            type: String,
        },
        translatorLocale: {
            type: String,
        },
        apiUrl: {
            type: String,
            default: 'http://localhost:3001',
        },
    },
    emits: ['created', 'deleted', 'updated', 'failed'],
    setup(props, setup) {
        const protocol = ref<string | null>(null);
        const preset = ref<string | null>(null);

        const entity = toRef(props, 'entity');
        const updatedAt = useUpdatedAt(entity);

        const set = () => {
            if (entity.value) {
                if (entity.value.preset) {
                    preset.value = entity.value.preset;
                }

                if (entity.value.protocol) {
                    protocol.value = entity.value.protocol;
                }
            }
        };

        set();

        onChange(updatedAt, () => set());

        const renderPicker = () : VNodeChild => h(IdentityProviderPicker, {
            onPick(value: { protocol?: `${IdentityProviderProtocol}`, preset?: `${IdentityProviderPreset}` }) {
                if (value.protocol) {
                    protocol.value = value.protocol;
                } else {
                    protocol.value = null;
                }

                if (value.preset) {
                    preset.value = value.preset;
                } else {
                    preset.value = null;
                }
            },
        });

        const render = (node: VNodeChild) : VNodeChild => {
            if (!entity.value) {
                return [
                    renderPicker(),
                    h('hr'),
                    node,
                ];
            }

            return node;
        };

        return () => {
            if (!protocol.value && !preset.value) {
                return renderPicker();
            }

            if (protocol.value) {
                switch (protocol.value) {
                    case IdentityProviderProtocol.OAUTH2:
                    case IdentityProviderProtocol.OIDC: {
                        return render(h(IdentityProviderOAuth2Form, {
                            entity: entity.value,
                            realmId: props.realmId,
                            translatorLocale: props.translatorLocale,
                            protocol: protocol.value,
                            preset: preset.value,
                            apiUrl: props.apiUrl,
                            onCreated(el: IdentityProvider) {
                                entity.value = el;

                                setup.emit('created', el);
                            },
                            onUpdated(el: IdentityProvider) {
                                entity.value = el;

                                setup.emit('updated', el);
                            },
                        }));
                    }
                }
            }

            let prefix : string | undefined;
            if (protocol.value) {
                prefix = protocol.value;
            }
            if (preset.value) {
                prefix = preset.value;
            }

            return render(h('div', { class: 'alert alert-warning alert-sm' }, [
                `${prefix} is not supported yet :/`,
            ]));
        };
    },
});
