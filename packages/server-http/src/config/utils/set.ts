/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { makeURLPublicAccessible } from '@authup/common';
import { useConfig } from '../module';
import { OptionsInput } from '../type';

export function setConfigOptions(options: OptionsInput) {
    const config = useConfig();
    config.setRaw(options);

    if (
        !config.has('publicUrl') &&
        (
            config.has('host') ||
            config.has('port')
        )
    ) {
        config.setRaw(
            'publicUrl',
            makeURLPublicAccessible(`http://${config.get('host')}:${config.get('port')}`),
        );
    }

    return config.getAll();
}
