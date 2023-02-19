/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Options as ServerOptions, OptionsInput as ServerOptionsInput } from '@authup/server';
import type { UIOptions, UIOptionsInput } from '../packages';

export type Options = {
    server: ServerOptions,
    ui: UIOptions
};

export type OptionsInput = {
    server?: ServerOptionsInput,

    ui?: UIOptionsInput
};
