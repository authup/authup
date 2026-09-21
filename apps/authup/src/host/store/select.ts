/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFileTokenStorage } from './file.ts';
import { createKeychainTokenStorage } from './keychain.ts';
import type { HostStorage, IHostStore, IHostTokenStorage } from './types.ts';

const keychain = createKeychainTokenStorage();

export function selectTokenStorage(storage: HostStorage, store: IHostStore) : IHostTokenStorage {
    return storage === 'file' ?
        createFileTokenStorage(store) :
        keychain;
}
