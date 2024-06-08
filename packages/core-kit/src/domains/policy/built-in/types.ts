/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AttributeNamesPolicy } from './attribute-names';
import type { AttributesPolicy } from './attributes';
import type { DatePolicy } from './date';
import type { GroupPolicy } from './group';
import type { TimePolicy } from './time';

export type PolicyBuiltIn = AttributesPolicy |
AttributeNamesPolicy |
DatePolicy |
GroupPolicy |
TimePolicy;
