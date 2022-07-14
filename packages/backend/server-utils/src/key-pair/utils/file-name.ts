/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { KeyPairKind } from '../constants';
import { KeyPairContext } from '../type';
import { extendKeyPairContext } from './context';

export function buildKeyFileName(
    type: `${KeyPairKind}`,
    context?: KeyPairContext,
) {
    context = extendKeyPairContext(context);

    const parts : string[] = [];

    switch (type) {
        case KeyPairKind.PRIVATE: {
            if (context.privateName) {
                parts.push(context.privateName);
            } else {
                parts.push(type);
            }

            if (context.privateExtension) {
                if (context.privateExtension.startsWith('.')) {
                    context.privateExtension = context.privateExtension.slice(1);
                }
                parts.push(context.privateExtension);
            } else {
                parts.push('pem');
            }
            break;
        }
        case KeyPairKind.PUBLIC: {
            if (context.publicName) {
                parts.push(context.publicName);
            } else {
                parts.push(type);
            }

            if (context.publicExtension) {
                if (context.publicExtension.startsWith('.')) {
                    context.publicExtension = context.publicExtension.slice(1);
                }
                parts.push(context.publicExtension);
            } else {
                parts.push('pem');
            }
            break;
        }
    }

    return parts.join('.');
}
