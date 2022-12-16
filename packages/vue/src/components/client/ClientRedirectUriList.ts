/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Ref, computed, defineComponent, h, ref,
} from 'vue';
import { ClientRedirectUriListItem } from './ClientRedirectUriListItem';

export const ClientRedirectUriList = defineComponent({
    name: 'ClientRedirectUriList',
    props: {
        uri: {
            type: String,
            default: undefined,
        },
        translatorLocale: {
            type: String,
            default: undefined,
        },
    },
    emits: ['updated'],
    setup(props, ctx) {
        const items : Ref<string[]> = ref([]);

        if (props.uri) {
            const uris = props.uri.split(',');
            items.value.push(...uris);
        }

        const handleChange = () => {
            ctx.emit('updated', items.value.join(','));
        };

        const canAdd = computed(() => {
            if (items.value.length === 0) {
                return true;
            }

            const lastEl = items.value[items.value.length - 1];
            return lastEl && lastEl.trim() !== '';
        });

        const render = () => {
            const elements = items.value.map((item, index) => h(
                ClientRedirectUriListItem,
                {
                    disabled: items.value.length <= 1,
                    translatorLocale: props.translatorLocale,
                    class: 'mb-2',
                    uri: item,
                    onUpdated(input) {
                        items.value[index] = input;
                        handleChange();
                    },
                    onDeleted() {
                        items.value.splice(index, 1);
                        handleChange();
                    },
                },
            ));

            const button = h('button', {
                type: 'button',
                class: 'btn btn-xs btn-primary',
                disabled: !canAdd.value,
                onClick($event: any) {
                    $event.preventDefault();

                    items.value.push('');
                },
            }, [
                h('i', { class: 'fa-solid fa-plus pe-1' }),
                'Add',
            ]);

            return h('div', [
                elements,
                button,
            ]);
        };

        return () => render();
    },
});
