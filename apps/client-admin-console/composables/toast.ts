/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Thin wrapper over `@vuecs/overlays`'s `useToast()` that preserves
 * the bvnext-shaped call surface authup code was written against:
 *
 *   toast.show('Quick message');
 *   toast.show({ variant: 'success', body: 'Saved' });
 *
 * Migration audit (May 2026): every `toast.show()` site in authup
 * passes only `variant` + `body` — bvnext extras like `noAutoHide`,
 * `delay`, `solid`, `noFade` are not used. If a new caller needs them,
 * extend `ToastShowOptions` below and forward to `toast.add(...)`'s
 * matching field (`duration`, etc.).
 *
 * Per-toast `position` is intentionally dropped — the new vuecs toast
 * model puts position on the `<VCToaster>` viewport (see
 * `apps/client-admin-console/components/footer.vue`).
 */
import { isObject } from '@authup/kit';
import { useToast as useVuecsToast } from '@vuecs/overlays';

type LegacyVariant = 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'secondary' | 'light' | 'dark';
type VuecsColor = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'error';

function variantToColor(variant?: string): VuecsColor {
    switch (variant) {
        case 'success': return 'success';
        case 'warning': return 'warning';
        case 'danger': return 'error';
        case 'info': return 'info';
        case 'primary': return 'primary';
        default: return 'neutral';
    }
}

type ToastShowOptions = {
    body?: string;
    title?: string;
    variant?: LegacyVariant;
    position?: string;
    [key: string]: unknown;
};

export function useToast() {
    const toast = useVuecsToast();

    function showImpl(opts: ToastShowOptions) {
        toast.add({
            title: opts.title,
            description: opts.body,
            color: variantToColor(opts.variant),
        });
    }

    return {
        show(
            el: string | ToastShowOptions,
            options: ToastShowOptions = {},
        ) {
            if (isObject(el)) {
                showImpl(el as ToastShowOptions);
                return;
            }

            showImpl({
                ...options,
                body: el,
            });
        },
    };
}
