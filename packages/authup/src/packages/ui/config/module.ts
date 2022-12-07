/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { UIOptions, UIOptionsInput } from '../type';
import { validateUiConfig } from './validate';

export function applyUiConfig(input: UIOptionsInput) : UIOptions {
    return extendUiConfig(validateUiConfig(input));
}

export function extendUiConfig(input: UIOptionsInput) : UIOptions {
    return {
        port: input.port || 3000,
        host: input.host || '0.0.0.0',
    };
}
