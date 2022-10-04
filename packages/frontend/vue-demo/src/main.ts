/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createApp } from 'vue';
import { getBuildInPresets, setPresets } from '@vue-layout/hyperscript';
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

    setPresets(getBuildInPresets([
        'bootstrapV5',
        'fontAwesome',
    ]));

    createApp(Dev)
        .use(AuthVue, {
            httpClient: api,
        })
        .mount('#app');
})();
