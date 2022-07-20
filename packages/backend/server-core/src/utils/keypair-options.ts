/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { KeyPairOptions } from '@authelion/server-utils';
import { Config } from '../config';

export function buildKeyPairOptionsFromConfig(config: Config) : Partial<KeyPairOptions> {
    return {
        directory: config.writableDirectoryPath,
        passphrase: config.keyPairPassphrase,
        privateName: config.keyPairPrivateName,
        privateExtension: config.keyPairPrivateExtension,
    };
}
