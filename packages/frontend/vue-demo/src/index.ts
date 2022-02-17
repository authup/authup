/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import AuthVue from '@typescript-auth/vue';
import Vue, { VNode } from 'vue';
import { BootstrapVue } from 'bootstrap-vue';
import Vuelidate from 'vuelidate';
import { useAPI } from './api';

// CSS
import '@fortawesome/fontawesome-free/css/all.css';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';
import '../assets/css/index.css';
import '../assets/css/bootstrap-override.css';

import Dev from './components/index.vue';

// Make BootstrapVue available throughout your project

(async () => {
    const api = useAPI();

    const token = await api.token.create({
        username: 'admin',
        password: 'start123',
    });

    api.setAuthorizationHeader({
        type: 'Bearer',
        token: token.access_token,
    });

    Vue.use(BootstrapVue);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Vue.use(Vuelidate);

    Vue.use(AuthVue, {
        httpClient: api,
    });

    Vue.config.productionTip = false;

    Vue.prototype.$authApi = api;

    new Vue({
        render: (h): VNode => h(Dev),
    }).$mount('#app');
})();
