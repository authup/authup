/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createApp } from 'vue';
import Utils, { Config, Preset } from '@vue-layout/utils';
import AuthVue, { setHTTPClient } from '@authelion/vue';
import { Client } from '@hapic/oauth2';
import { useAPI } from './api';

// CSS
import '@fortawesome/fontawesome-free/css/all.css';
import 'bootstrap/dist/css/bootstrap.css';
import '../assets/css/index.css';
import '../assets/css/bootstrap-override.css';

import Dev from './components/index.vue';

// Make BootstrapVue available throughout your project

(async () => {
    const api = useAPI();

    const client = new Client();
    await client.useOpenIDDiscovery(api.getUri());

    const token = await client.token.createWithPasswordGrant({
        username: 'admin',
        password: 'start123',
    });

    api.setAuthorizationHeader({
        type: 'Bearer',
        token: token.access_token,
    });

    setHTTPClient(api);

    createApp(Dev)
        .use(Utils, {
            preset: {
                [Preset.BOOTSTRAP_V5]: {
                    enabled: true,
                },
                [Preset.FONT_AWESOME]: {
                    enabled: true,
                },
            },
        } as Partial<Config>)
        .use(AuthVue, {
            httpClient: api,
        })
        .mount('#app');
})();
