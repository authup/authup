/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { useConfig } from '../module';
import type { Options, OptionsInput } from '../type';

export function setConfigOptions(
    input: OptionsInput,
) : Options {
    const config = useConfig();
    config.setRaw(input);

    return config.get();
}
