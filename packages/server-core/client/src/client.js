/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createApp } from './app';

const { app, router } = createApp();

router.isReady().then(() => {
    app.mount('#app');
});
