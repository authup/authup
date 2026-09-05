/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OptionsInput } from '@routup/prometheus';
import { prometheus } from '@routup/prometheus';
import type { IApp, IAppEvent } from 'routup';

const PATH_LABEL_UNMATCHED = '/{unmatched}';

type RouteTemplate = {
    method?: string,
    segments: string[],
    label: string,
};

type RouteTemplates = {
    exact: RouteTemplate[],
    prefix: RouteTemplate[],
};

function toPathSegments(path: string): string[] {
    return path.split('/').filter((segment) => segment.length > 0);
}

function isParameterSegment(segment: string): boolean {
    return segment.startsWith(':') || segment === '*';
}

function matchSegments(
    templateSegments: string[],
    segments: string[],
    prefix: boolean,
): boolean {
    if (
        prefix ?
            segments.length < templateSegments.length :
            segments.length !== templateSegments.length
    ) {
        return false;
    }

    for (const [i, templateSegment] of templateSegments.entries()) {
        if (isParameterSegment(templateSegment)) {
            continue;
        }

        if (templateSegment !== segments[i]) {
            return false;
        }
    }

    return true;
}

function buildRouteTemplates(router: IApp): RouteTemplates {
    const exact: RouteTemplate[] = [];
    const prefix: RouteTemplate[] = [];
    const seen = new Set<string>();

    for (const route of router.routes) {
        if (typeof route.path !== 'string') {
            continue;
        }

        const segments = toPathSegments(route.path);
        const label = `/${segments.join('/')}`;
        const key = `${route.method || ''} ${label}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);

        if (route.method) {
            exact.push({
                method: route.method,
                segments,
                label,
            });
        } else if (segments.length > 0) {
            prefix.push({ segments, label });
        }
    }

    prefix.sort((a, b) => b.segments.length - a.segments.length);

    return { exact, prefix };
}

/**
 * The `path` label must stay bounded: labeling by the raw request path lets
 * every probed id (`/users/<random-uuid>`, even on 401/404) mint a new
 * prom-client time-series — unbounded registry growth. Requests are instead
 * labeled by the registered route template (`/users/:id`), read from the
 * router's own route table (child apps are flattened into the root with full
 * patterns, and all routes are registered before `listen`, so a snapshot at
 * first request is complete). Method-agnostic mounts (`/docs`, a console
 * handler's mount under `authup start`) label as `<mount>/**`; anything else collapses into
 * one unmatched bucket.
 */
export function createRouteTemplateNormalizePath(
    router: IApp,
): (path: string, event: IAppEvent) => string {
    let templates : RouteTemplates | undefined;

    return (path, event) => {
        if (!templates) {
            templates = buildRouteTemplates(router);
        }

        const segments = toPathSegments(path);
        const method = `${event.method}`.toUpperCase();

        for (const template of templates.exact) {
            if (
                template.method !== method &&
                !(method === 'HEAD' && template.method === 'GET')
            ) {
                continue;
            }

            if (matchSegments(template.segments, segments, false)) {
                return template.label;
            }
        }

        for (const template of templates.exact) {
            if (matchSegments(template.segments, segments, false)) {
                return template.label;
            }
        }

        for (const template of templates.prefix) {
            if (matchSegments(template.segments, segments, true)) {
                return `${template.label}/**`;
            }
        }

        return PATH_LABEL_UNMATCHED;
    };
}

export function registerPrometheusMiddleware(router: IApp, input?: OptionsInput) {
    let options : OptionsInput = {
        normalizePath: createRouteTemplateNormalizePath(router),
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
