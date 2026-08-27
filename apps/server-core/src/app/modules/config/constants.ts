/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CORE_CONFIG_SECTION } from '@authup/server-config';
import { TypedToken } from 'eldin';
import type { Config } from './types.ts';

export const ConfigInjectionKey = new TypedToken<Config>('Config');

/**
 * The section of `authup.yml` this service's own keys live under, re-exported
 * from the package that declares them so the two cannot spell it differently.
 * Every entry already carries its absolute path, so this is the anchor those
 * paths were written from rather than a prefix a reader applies.
 */
export const CONFIG_SECTION = CORE_CONFIG_SECTION;

/**
 * The one file the configuration is read from, and the extensions it may
 * carry. `conf` is deliberately absent: the `authup.conf` family was retired
 * in favour of a single `authup.yml` (plan 101 stage C).
 */
export const CONFIG_FILE_NAME = 'authup';
export const CONFIG_FILE_EXTENSIONS = ['yml', 'yaml', 'json', 'js', 'mjs', 'cjs', 'ts', 'mts'];
