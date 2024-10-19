/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useCache } from '@authup/server-kit';
import { singa } from 'singa';
import { OAuth2Cache } from './module';

const instance = singa<OAuth2Cache>({
    name: 'oauth2Cache',
});
instance.setFactory(() => {
    const cache = useCache();

    return new OAuth2Cache(cache);
});

export function useOAuth2Cache() {
    return instance.use();
}
