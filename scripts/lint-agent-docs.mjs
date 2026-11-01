/*
 * Ratchet for the agent docs (AGENTS.md, .agents/*.md, .agents/topics/*.md).
 *
 * Every file has a byte budget and a history-phrase budget in
 * .agents/budget.json. A file over either budget fails. A file well under its
 * budget is reported so the budget can be lowered in the same PR: budgets only
 * ever go down. A new file needs an explicit budget entry.
 *
 * Usage: node scripts/lint-agent-docs.mjs [--update]
 *   --update  lower every budget to the current value (never raises one)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BUDGET_FILE = path.join(ROOT, '.agents', 'budget.json');

// Phrases that narrate history or cite a local artifact instead of stating a rule.
const HISTORY_PATTERN = /plan [0-9]{3}|\bused to\b|\bbefore #[0-9]|\bno longer\b|\bpinned by\b/gi;

// Report a file whose size dropped this far below its budget.
const SLACK = 0.9;

function listFiles() {
    const files = ['AGENTS.md'];
    for (const dir of ['.agents', '.agents/topics']) {
        const abs = path.join(ROOT, dir);
        if (!fs.existsSync(abs)) continue;
        for (const name of fs.readdirSync(abs)) {
            if (name.endsWith('.md')) files.push(`${dir}/${name}`);
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

const update = process.argv.includes('--update');
const budget = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));
const errors = [];
const hints = [];

for (const file of listFiles()) {
    const current = measure(file);
    const limit = budget.files[file];
    if (!limit) {
        errors.push(`${file}: no budget. Add it to .agents/budget.json (new topic files start at most at ${budget.newTopicBytes} bytes).`);
        continue;
    }
    if (current.bytes > limit.bytes) {
        errors.push(`${file}: ${current.bytes} bytes, budget ${limit.bytes}. Rewrite or move detail out; do not raise the budget.`);
    }
    if (current.history > limit.history) {
        errors.push(`${file}: ${current.history} history phrases (used to / no longer / before # / pinned by / plan NNN), budget ${limit.history}. State the rule as it is now.`);
    }
    if (update) {
        limit.bytes = Math.min(limit.bytes, current.bytes);
        limit.history = Math.min(limit.history, current.history);
    } else if (current.bytes < limit.bytes * SLACK || current.history < limit.history) {
        hints.push(`${file}: under budget (${current.bytes}/${limit.bytes} bytes, ${current.history}/${limit.history} phrases). Run with --update to lower it.`);
    }
}

for (const file of Object.keys(budget.files)) {
    if (!fs.existsSync(path.join(ROOT, file))) errors.push(`${file}: budget entry for a file that does not exist.`);
}

if (update) {
    fs.writeFileSync(BUDGET_FILE, `${JSON.stringify(budget, null, 4)}\n`);
}

for (const hint of hints) console.log(`hint: ${hint}`);
for (const error of errors) console.error(`error: ${error}`);
process.exit(errors.length ? 1 : 0);
