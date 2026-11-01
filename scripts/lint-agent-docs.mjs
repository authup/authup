/*
 * Ratchet for the agent docs (AGENTS.md, .agents/*.md, .agents/topics/*.md).
 *
 * Every file has a byte budget and a history-phrase budget in
 * .agents/budget.json. A file over either budget fails. Budgets only ever go
 * down: after shortening a file, run with --update to lower them (to the new
 * size plus a little headroom). A new file needs a budget entry.
 *
 * With --base <ref> (CI on a pull request) the budgets themselves are checked
 * against the ones on <ref>: no entry may rise, and an entry the base does not
 * have may not exceed newTopicBytes. Without it, raising a budget in the same
 * change as the file would pass.
 *
 * Usage: node scripts/lint-agent-docs.mjs [--update] [--base <ref>]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BUDGET_PATH = '.agents/budget.json';

// Phrases that narrate history or cite a local artifact instead of stating a rule.
// "used to" after a form of "be" or "get" is the passive voice ("is used to
// validate"), which states a current fact, so it does not match.
const HISTORY_PATTERN = /plan [0-9]{3}|(?<!\b(?:is|are|am|be|been|being|was|were|get|gets|got|getting)\s+)\bused to\b|\bbefore #[0-9]|\bno longer\b|\bpinned by\b/gi;

// --update leaves this much room above the current size, so a correction
// that adds a few words still fits. It never raises a budget.
const HEADROOM_RATIO = 0.05;
const HEADROOM_MIN_BYTES = 512;

// Report a file whose size dropped this far below its budget.
const SLACK = 0.8;

function withHeadroom(bytes) {
    return bytes + Math.max(HEADROOM_MIN_BYTES, Math.ceil(bytes * HEADROOM_RATIO));
}

function listFiles() {
    const files = ['AGENTS.md'];

    for (const dir of ['.agents', '.agents/topics']) {
        const abs = path.join(ROOT, dir);

        if (!fs.existsSync(abs)) {
            continue;
        }

        for (const name of fs.readdirSync(abs)) {
            if (name.endsWith('.md')) {
                files.push(`${dir}/${name}`);
            }
        }
    }

    return files.sort();
}

function measure(file) {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');

    return {
        bytes: Buffer.byteLength(text),
        history: (text.match(HISTORY_PATTERN) || []).length,
    };
}

function readBaseBudget(ref) {
    try {
        const content = execFileSync('git', ['show', `${ref}:${BUDGET_PATH}`], {
            cwd: ROOT,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        });

        return JSON.parse(content);
    } catch {
        // The base predates the budget file: everything counts as new.
        return null;
    }
}

function checkAgainstBase(budget, base, errors) {
    const maxNew = base ? Math.min(base.newTopicBytes, budget.newTopicBytes) : budget.newTopicBytes;

    if (base && budget.newTopicBytes > base.newTopicBytes) {
        errors.push(`newTopicBytes rose from ${base.newTopicBytes} to ${budget.newTopicBytes}. Budgets only go down.`);
    }

    for (const [file, limit] of Object.entries(budget.files)) {
        const previous = base ? base.files[file] : undefined;

        if (!previous) {
            if (base && limit.bytes > maxNew) {
                errors.push(`${file}: a new file's budget is ${limit.bytes} bytes, above newTopicBytes (${maxNew}). Split it or cut it down.`);
            }

            continue;
        }

        if (limit.bytes > previous.bytes) {
            errors.push(`${file}: byte budget rose from ${previous.bytes} to ${limit.bytes}. Budgets only go down.`);
        }

        if (limit.history > previous.history) {
            errors.push(`${file}: history budget rose from ${previous.history} to ${limit.history}. Budgets only go down.`);
        }
    }
}

const args = process.argv.slice(2);
const update = args.includes('--update');
const baseIndex = args.indexOf('--base');
const baseRef = baseIndex === -1 ? undefined : args[baseIndex + 1];

if (baseIndex !== -1 && !baseRef) {
    console.error('error: --base needs a git ref');
    process.exit(1);
}

const budget = JSON.parse(fs.readFileSync(path.join(ROOT, BUDGET_PATH), 'utf8'));
const errors = [];
const hints = [];

for (const file of listFiles()) {
    const current = measure(file);
    const limit = budget.files[file];

    if (!limit) {
        errors.push(`${file}: no budget. Add it to ${BUDGET_PATH}, at most ${budget.newTopicBytes} bytes for a new file.`);

        continue;
    }

    if (current.bytes > limit.bytes) {
        errors.push(`${file}: ${current.bytes} bytes, budget ${limit.bytes}. Rewrite or move detail out; do not raise the budget.`);
    }

    if (current.history > limit.history) {
        errors.push(`${file}: ${current.history} history phrases (used to / no longer / before # / pinned by / plan NNN), budget ${limit.history}. State the rule as it is now.`);
    }

    if (update) {
        limit.bytes = Math.min(limit.bytes, withHeadroom(current.bytes));
        limit.history = Math.min(limit.history, current.history);
    } else if (current.bytes < limit.bytes * SLACK || current.history < limit.history) {
        hints.push(`${file}: under budget (${current.bytes}/${limit.bytes} bytes, ${current.history}/${limit.history} phrases). Run with --update to lower it.`);
    }
}

for (const file of Object.keys(budget.files)) {
    if (!fs.existsSync(path.join(ROOT, file))) {
        errors.push(`${file}: budget entry for a file that does not exist.`);
    }
}

if (baseRef) {
    checkAgainstBase(budget, readBaseBudget(baseRef), errors);
}

if (update) {
    fs.writeFileSync(path.join(ROOT, BUDGET_PATH), `${JSON.stringify(budget, null, 4)}\n`);
}

for (const hint of hints) {
    console.log(`hint: ${hint}`);
}

for (const error of errors) {
    console.error(`error: ${error}`);
}

process.exit(errors.length ? 1 : 0);
