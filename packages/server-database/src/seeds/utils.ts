/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'fs';
import path from 'path';
import type { DatabaseRootSeederResult } from './type';

export async function saveSeedResult(
    writableDirectoryPath: string,
    data: DatabaseRootSeederResult,
) {
    if (
        !data.robot ||
        !data.robot.secret
    ) {
        return;
    }

    const seedResultPath = path.join(writableDirectoryPath, 'seed.json');

    try {
        await fs.promises.access(seedResultPath, fs.constants.F_OK);
        await fs.promises.unlink(seedResultPath);
    } catch (e) {
        // do nothing :)
    }

    await fs.promises.writeFile(seedResultPath, JSON.stringify({
        robotId: data.robot.id,
        robotSecret: data.robot.secret,
    }));
}
