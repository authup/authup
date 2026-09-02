/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import { EnvironmentName } from '@authup/kit';

/**
 * `authup dev` must never run a production deployment, and the refusal has to
 * be here rather than left to the detection rule.
 *
 * The shipped container is what makes it reachable: its Dockerfile runs
 * `COPY . .` and `npm ci` BEFORE `ENV NODE_ENV=production` and prunes
 * nothing, so every `vite.config.ts` is present and every devDependency is
 * installed, which is exactly the state `isSourceCheckout` reports as a
 * source checkout. `entrypoint.sh` passes any command straight through while
 * exporting `HOST=0.0.0.0`. So a production image started with `dev` would
 * put a vite dev server, a file watcher and an unauthenticated `/@fs/`
 * reader on a public port, over the real database and the real signing keys.
 *
 * The environment read is server-core's own notion (`config.env`, the `env`
 * key backed by `NODE_ENV`), never `process.env` directly, so an operator who
 * declares the environment in `authup.yml` is covered by the same gate.
 */
export function assertNotProduction(env: string) : void {
    if (env === EnvironmentName.PRODUCTION) {
        throw new AuthupError(
            'The dev command refuses to run with env set to production: it starts a vite dev server ' +
            'with a file watcher and a filesystem reader over this deployment\'s own configuration, ' +
            'database and signing keys. Run `authup start` instead.',
        );
    }
}
