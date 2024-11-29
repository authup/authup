/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';

import { createConfig } from '../../rollup.config.mjs';

export default createConfig({
    pkg: JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), {encoding: 'utf-8'}))
});
