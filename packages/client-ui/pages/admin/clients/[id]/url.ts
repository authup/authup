/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, ClientScope } from '@authup/core';
import { buildVuelidateTranslator } from '@authup/client-vue';
import type { ListItemSlotProps } from '@vue-layout/list-controls';
import { buildFormInput, buildFormInputCheckbox } from '@vue-layout/form-controls';
import { SlotName } from '@vue-layout/list-controls';
import type { PropType } from 'vue';
import { defineNuxtComponent, resolveComponent } from '#imports';

export default defineNuxtComponent({
    props: {
        entity: {
            type: Object as PropType<Client>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        // todo: remove this when nuxt is fixed
        if (!props.entity) {
            return () => h('div', []);
        }

        const scopes = ref<string[]>([]);
        const redirectUri = ref<string>('');

        const config = useRuntimeConfig();

        const generatedUrl = computed(() => {
            const link = new URL('authorize', config.publicUrl);
            link.searchParams.set('client_id', props.entity.id);

            if (scopes.value.length > 0) {
                link.searchParams.set('scope', encodeURIComponent(scopes.value.join(' ')));
            }

            if (redirectUri.value) {
                link.searchParams.set('redirect_uri', encodeURIComponent(redirectUri.value));
            }

            return link.href;
        });

        const list = resolveComponent('ScopeList');

        const toggleScope = (scope: string) => {
            const index = scopes.value.indexOf(scope);
            if (index === -1) {
                scopes.value.push(scope);
            } else {
                scopes.value.splice(index, 1);
            }
        };

        const render = () => {
            const redirectUriInput = buildFormInput({
                labelContent: 'Redirect URL',
                props: {
                    placeholder: '...',
                },
                value: redirectUri,
            });

            const generatedUrlInput = buildFormInput({
                labelContent: 'Generated URL',
                props: {
                    disabled: true,
                },
                value: generatedUrl,
            });

            const list = resolveComponent('ClientScopeList');

            return h('div', [
                h('h6', 'URL Generator'),
                h('div', { class: 'mb-1' }, [
                    'Generate an authorize url by picking the scopes it needs to function.',
                ]),
                h('hr'),
                h(list as string, {
                    headerTitle: false,
                    headerSearch: false,
                    query: {
                        filter: {
                            client_id: props.entity.id,
                        },
                        relations: ['scope'],
                    },
                }, {
                    [SlotName.ITEM]: (props: ListItemSlotProps<ClientScope>) => buildFormInputCheckbox({
                        validationTranslator: buildVuelidateTranslator(props.translatorLocale),
                        value: scopes.value.indexOf(props.data.scope.name) !== -1,
                        onChange(input) {
                            toggleScope(props.data.scope.name);
                        },
                        label: true,
                        labelContent: props.data.scope.name,
                    }),
                }),
                h('hr'),
                redirectUriInput,
                h('hr'),
                generatedUrlInput,
            ]);
        };

        return () => render();
    },
});
