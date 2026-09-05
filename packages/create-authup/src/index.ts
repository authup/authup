#!/usr/bin/env node

/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/* eslint-disable no-console */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { createReadlineAsk } from './ask.ts';
import { TARGETS } from './constants.ts';
import { collectAnswers } from './prompts.ts';
import { dockerRunCommand } from './targets/docker.ts';
import { HELM_COMMANDS } from './targets/helm.ts';
import { RENDERERS } from './targets/index.ts';
import type { Answers, Target } from './types.ts';
import { VERSION } from './version.ts';

const DOCS_URL = 'https://authup.org/guide/deployment/';

const USAGE = `Usage: npx create-authup [--force] [--help]
       npm create authup -- [--force] [--help]

Writes the deployment files for one authup installation into the current directory.

Targets: ${TARGETS.join(', ')}

Flags:
  --force  overwrite files that already exist
  --help   print this text`;

function nextSteps(answers: Answers): string[] {
    const steps: Record<Target, string[]> = {
        docker: [
            dockerRunCommand(VERSION),
            'The database must already exist: the image runs in production mode and refuses sqlite.',
        ],
        compose: [
            ...(answers.workerSplit ? ['docker compose run --rm authup migration run'] : []),
            'docker compose up -d',
        ],
        helm: [...HELM_COMMANDS],
        'bare-metal': ['npm install', 'npx authup config validate', 'npm start'],
    };

    return steps[answers.target];
}

async function main(): Promise<void> {
    const { values } = parseArgs({
        options: {
            force: { type: 'boolean', default: false },
            help: { type: 'boolean', default: false },
        },
        allowPositionals: false,
    });
    if (values.help) {
        console.log(USAGE);
        return;
    }

    console.log(`create-authup ${VERSION}`);
    console.log(`Files are written into the current directory (${process.cwd()}).`);

    const { ask, close } = createReadlineAsk();
    let collected: Awaited<ReturnType<typeof collectAnswers>>;
    try {
        collected = await collectAnswers(ask);
    } finally {
        close();
    }
    const { answers, notes } = collected;

    const rendered = RENDERERS[answers.target](answers, VERSION);
    const files = Object.keys(rendered);
    const directories = files.filter((name) => {
        try {
            return fs.statSync(path.join(process.cwd(), name)).isDirectory();
        } catch {
            return false;
        }
    });
    if (directories.length > 0) {
        console.error(`Cannot write over a directory: ${directories.join(', ')}.`);
        process.exit(1);
    }

    const existing = files.filter((name) => fs.existsSync(path.join(process.cwd(), name)));
    if (existing.length > 0 && !values.force) {
        console.error(`Refusing to overwrite: ${existing.join(', ')}. Re-run with --force.`);
        process.exit(1);
    }

    for (const name of files) {
        fs.writeFileSync(path.join(process.cwd(), name), rendered[name], 'utf8');
    }

    for (const note of notes) {
        console.log(note);
    }
    console.log(`Written: ${files.join(', ')}`);
    console.log('Next steps:');
    for (const step of nextSteps(answers)) {
        console.log(`  ${step}`);
    }
    console.log(`Docs: ${DOCS_URL}`);
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
});
