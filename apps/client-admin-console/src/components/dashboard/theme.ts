/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * A css custom property's current value, read off the document root so a
 * canvas can paint with the theme's own colour. The root is where the theme
 * declares its tokens and where the `.dark` flip lands, so the value follows
 * the colour mode without the chart knowing the palette.
 */
export function readThemeToken(name: string, fallback: string): string {
    if (typeof window === 'undefined') {
        return fallback;
    }

    const value = window.getComputedStyle(window.document.documentElement)
        .getPropertyValue(name)
        .trim();

    return value || fallback;
}
