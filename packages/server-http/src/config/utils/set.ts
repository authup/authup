/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useConfig } from '../module';
import { OptionsInput } from '../type';

export function setOptions(options: OptionsInput) {
    const config = useConfig();
    config.setRaw(options);

    return config.getAll();
}
