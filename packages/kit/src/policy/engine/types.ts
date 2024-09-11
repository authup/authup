/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyEvaluateContextInput } from '../evaluator';
import type { PolicyWithType } from '../types';

export type PolicyEngineEvaluateContext = Omit<PolicyEvaluateContextInput<PolicyWithType>, 'evaluators'>;
