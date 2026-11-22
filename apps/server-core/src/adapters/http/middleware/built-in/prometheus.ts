/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LabelTransformer, OptionsInput } from '@routup/prometheus';
import { prometheus } from '@routup/prometheus';
import type { IApp } from 'routup';

const PATH_LABEL_UNMATCHED = '/{unmatched}';

/**
 * The `path` label must stay bounded: labeling by the raw request path lets
 * every probed id (`/users/<random-uuid>`, even on 401/404) mint a new
 * prom-client time-series. The plugin labels a request by the pattern of the
 * method-bound route it dispatched (`/users/:id`, `HEAD` by its `GET` route)
 * and every other request by `unmatchedPath`.
 *
 * This transformer relabels the requests no method-bound route handled but
 * that fall under a method-less mount (`/docs`, a console handler's mount
 * under `authup start`) as `<mount>/**`, so dashboards keep one series per
 * mount. Only parameter-free mounts qualify, so the label set stays the set
 * of mount paths. They are read from the router's route table at the first
 * request: every mount is registered before `listen`, while this plugin is
 * installed before any of them.
 */
export function createMountPathLabelTransformer(router: IApp): LabelTransformer {
    let mounts : string[] | undefined;

    return (labels, event) => {
        if (event.route) {
            return;
        }

        if (!mounts) {
            mounts = router.routes
                .filter((route) => !route.method &&
                    typeof route.path === 'string' &&
                    route.path !== '/' &&
                    !/[:*]/.test(route.path))
                .map((route) => `${route.path}`.replace(/\/+$/, ''))
                .sort((a, b) => b.length - a.length);
        }

        const mount = mounts.find((prefix) => event.path === prefix ||
            event.path.startsWith(`${prefix}/`));

        if (mount) {
            labels.path = `${mount}/**`;
        }
    };
}

export function registerPrometheusMiddleware(router: IApp, input?: OptionsInput) {
    let options : OptionsInput = {
        unmatchedPath: PATH_LABEL_UNMATCHED,
        requestDurationLabelTransformer: createMountPathLabelTransformer(router),
        skip(event) {
            let { path } = event;

            if (!path.startsWith('/')) {
                path = `/${path}`;
            }

            return path.startsWith('/metrics') ||
                path === '/';
        },
    };

    if (input) {
        options = {
            ...options,
            ...input,
        };
    }

    router.use(prometheus(options));
}
