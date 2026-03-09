/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const filePath = path.join(__dirname, '.output', 'server', 'index.mjs');

let content = fs.readFileSync(filePath, {encoding: 'utf-8'});
content = '#!/usr/bin/env node \n' + content;

fs.writeFileSync(filePath, content, { encoding: 'utf-8' });
