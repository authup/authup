/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Renderer, Target } from '../types.ts';
import { renderBareMetal } from './bare-metal.ts';
import { renderCompose } from './compose.ts';
import { renderDocker } from './docker.ts';
import { renderHelm } from './helm.ts';

export const RENDERERS: Record<Target, Renderer> = {
    docker: renderDocker,
    compose: renderCompose,
    helm: renderHelm,
    'bare-metal': renderBareMetal,
};
