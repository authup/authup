/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createApp } from './app';
import { getWindowPayload } from './window';

const payload = getWindowPayload();
const { app, router } = createApp(payload);

router.isReady().then(() => {
    app.mount('#app');
});
