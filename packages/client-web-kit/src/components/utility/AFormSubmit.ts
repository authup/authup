/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue';
import { VCButton } from '@vuecs/button';
import { useSubmitButton } from '@vuecs/forms';

/**
 * Submit button for entity forms. Reactive label / icon / color swap
 * between create and update modes via `@vuecs/forms`'s `useSubmitButton`
 * composable, whose values resolve through the vuecs `DefaultsManager`
 * (wired once at app bootstrap — see `buildSubmitButtonDefaults()` in
 * `apps/client-web/plugins/vuecs.ts` / `apps/server-core/ui/src/app.ts`)
 * so labels stay locale-reactive.
 */
export const AFormSubmit = defineComponent({
    props: {
        isBusy: {
            type: Boolean,
            default: false,
        },
        isEditing: {
            type: Boolean,
            default: false,
        },
        isInvalid: {
            type: Boolean,
            default: false,
        },
    },
    emits: ['submit'],
    setup(props, { emit }) {
        const submitButton = useSubmitButton({
            isEditing: () => props.isEditing,
            loading: () => props.isBusy,
            disabled: () => props.isInvalid || props.isBusy,
        });

        return () => h(VCButton, {
            ...submitButton.value,
            size: 'sm',
            // `mt-3` matches the inter-group `mb-3` spacing so the button
            // sits one consistent gap below the last form field.
            class: 'mt-3',
            onClick: () => emit('submit'),
        });
    },
});
