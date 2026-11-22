/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createApp } from './app.ts';
import { getWindowPayload } from './window.ts';

const payload = getWindowPayload();
const {
    app,
    router,
} = createApp(payload);

router.isReady().then(() => {
    app.mount('#app');
});
