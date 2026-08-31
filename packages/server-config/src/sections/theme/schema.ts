/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    defineSchema,
    readEnvBool,
    readEnvString,
} from '@authup/server-config-kit';
import { z } from 'zod';
import { EnvironmentVariable } from '../../constants.ts';
import type { ThemeConfig } from './types.ts';

export const THEME_SCHEMA = defineSchema<
    ThemeConfig,
    never,
    EnvironmentVariable
>(
    {
        directoryPath: {
            type: z.string(),
            // '' = theming disabled. Deliberately NOT defaulted under a
            // process-writable directory: pairing "process-writable" with
            // "content injected into the login page" would turn any write
            // primitive landing there into persistent branding control on the
            // IdP origin.
            default: '',
            description: 'EXPERIMENTAL. Directory holding the operator theme applied to the served consoles (its assets are served under each console, its theme.json injects CSS custom properties); an empty value disables theming. ' +
            'SECURITY: the directory is operator trust, mount it read-only and never from a source a tenant can write.',
            env: EnvironmentVariable.THEME_DIRECTORY_PATH,
            readEnv: readEnvString,
        },
        fragmentsEnabled: {
            type: z.boolean(),
            default: false,
            description: 'EXPERIMENTAL. Opt in to splicing fragments/head.html from the theme directory into the head of every served console. ' +
            'SECURITY: the fragment is raw, unsanitized markup running on the IdP origin, so enabling it must be a deliberate operator decision.',
            env: EnvironmentVariable.THEME_FRAGMENTS_ENABLED,
            readEnv: readEnvBool,
        },
    },
    { pathPrefix: 'theme' },
);
