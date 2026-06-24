/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ButtonSize } from '@vuecs/button';

/**
 * Shared default size for buttons rendered by kit components.
 *
 * Every kit component that renders a `<VCButton>` exposes a `size` prop
 * defaulting to this constant, so sibling components render at the same
 * height by default. Change this single value to re-scale every kit button.
 */
export const DEFAULT_BUTTON_SIZE: ButtonSize = 'sm';
