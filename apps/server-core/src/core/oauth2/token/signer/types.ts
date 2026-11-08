/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Key } from '@authup/core-kit';
import type { OAuth2TokenPayload } from '@authup/specs';

export type OAuth2TokenSignOptions = {
    /**
     * Called with the key the signer resolved, before anything is signed. A
     * throw refuses the signature, so the check and the signature read one key.
     */
    assertKey?: (key: Pick<Key, 'type'>) => void,
};

export interface IOAuth2TokenSigner {
    sign<T extends OAuth2TokenPayload>(payload: T, options?: OAuth2TokenSignOptions) : Promise<string>
}
