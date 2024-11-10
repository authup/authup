/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { KeyPairKind } from '../constants';
import type { KeyPairOptions } from '../type';
import { extendKeyPairOptions } from './options';

export function buildKeyFileName(
    type: `${KeyPairKind}`,
    context?: Partial<KeyPairOptions>,
) {
    const options = extendKeyPairOptions(context);

    const parts : string[] = [];

    switch (type) {
        case KeyPairKind.PRIVATE: {
            if (options.privateName) {
                parts.push(options.privateName);
            } else {
                parts.push(type);
            }

            if (options.privateExtension) {
                if (options.privateExtension.startsWith('.')) {
                    options.privateExtension = options.privateExtension.slice(1);
                }

                parts.push(options.privateExtension);
            } else {
                parts.push('pem');
            }
            break;
        }
        case KeyPairKind.PUBLIC: {
            if (options.publicName) {
                parts.push(options.publicName);
            } else {
                parts.push(type);
            }

            if (options.publicExtension) {
                if (options.publicExtension.startsWith('.')) {
                    options.publicExtension = options.publicExtension.slice(1);
                }

                parts.push(options.publicExtension);
            } else {
                parts.push('pem');
            }
            break;
        }
    }

    return parts.join('.');
}
