/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TypedToken } from 'eldin';
import type { IAuthFlowMetrics } from '../../../core/index.ts';

export const MetricsInjectionKey = new TypedToken<IAuthFlowMetrics>('Metrics');
