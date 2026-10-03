#!/usr/bin/env node
// Appends prompt/final-response pairs from Claude Code transcripts to .agent-logs/.
// Wired to UserPromptSubmit and Stop. Entries are only ever appended, never rewritten.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const IDLE_MS = 10 * 60 * 1000;
const NO_RESPONSE = "_(no final response — turn was interrupted before Claude replied)_";

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

function git(args, cwd) {
  try {
    return execSync(`git ${args}`, { cwd, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

function textOf(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((b) => (b.type === "text" ? b.text : b.type === "image" ? "[image]" : null))
    .filter((s) => s !== null)
    .join("\n\n");
}

function isHumanPrompt(o) {
  if (o.type !== "user" || o.isMeta || o.isSidechain || o.isCompactSummary || o.isVisibleInTranscriptOnly) return false;
  const c = o.message && o.message.content;
  if (Array.isArray(c) && c.some((b) => b.type === "tool_result")) return false;
  if (o.origin && o.origin.kind && o.origin.kind !== "human") return false;
  const t = textOf(c);
  if (!t.trim()) return false;
  if (/^\s*<(local-command-stdout|local-command-stderr|local-command-caveat)>/.test(t)) return false;
  return true;
}

function parseTurns(file) {
  const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
  const turns = [];
  let cur = null;
  let lastModel = "";
  for (const line of lines) {
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    if (isHumanPrompt(o)) {
      cur = { prompt: textOf(o.message.content), promptTime: o.timestamp, model: "", trailing: [], respTime: "", respModel: "" };
      turns.push(cur);
      continue;
    }
    if (!cur || o.isSidechain || o.type !== "assistant" || !o.message) continue;
    const model = o.message.model || lastModel;
    lastModel = model;
    if (!cur.model) cur.model = model;
    const blocks = Array.isArray(o.message.content) ? o.message.content : [];
    if (blocks.some((b) => b.type === "tool_use")) cur.trailing = [];
    const texts = blocks.filter((b) => b.type === "text" && b.text.trim()).map((b) => b.text);
    if (texts.length) {
      cur.trailing.push(...texts);
      cur.respTime = o.timestamp;
      cur.respModel = model;
    }
  }
  for (const t of turns) if (!t.model) t.model = lastModel || "unknown";
  return turns;
}

function entry(type, num, sid, ts, model, body) {
  return `[LOG_ENTRY type=${type} num=${num} session=${sid.slice(0, 8)}]\ntimestamp: ${ts}\nmodel: ${model}\n\n${body}\n\n\n`;
}

function syncSession(transcript, opts) {
  const { logDir, author, project, current, input } = opts;
  const sid = path.basename(transcript, ".jsonl");
  const turns = parseTurns(transcript);
  if (!turns.length) return;

  const existing = fs.readdirSync(logDir).find((f) => f.endsWith(`_${sid}.md`));
  if (!existing && !current && Date.now() - fs.statSync(transcript).mtimeMs < IDLE_MS) return;

  const logFile = existing
    ? path.join(logDir, existing)
    : path.join(logDir, `${turns[0].promptTime.slice(0, 19).replace("T", "_").replace(/:/g, "-")}_${sid}.md`);
  const stateFile = path.join(logDir, ".state", `${sid}.json`);
  const old = existing ? fs.readFileSync(logFile, "utf8") : "";
  const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : { bodyStart: 0, written: [] };
  let body = old.slice(state.bodyStart);
  const written = new Set(state.written);

  const idle = Date.now() - fs.statSync(transcript).mtimeMs >= IDLE_MS;
  const isStop = current && input.hook_event_name === "Stop";
  let appended = false;

  turns.forEach((t, i) => {
    const num = i + 1;
    const last = i === turns.length - 1;
    if (!written.has(`PROMPT${num}`)) {
      body += entry("PROMPT", num, sid, t.promptTime, t.model, t.prompt);
      written.add(`PROMPT${num}`);
      appended = true;
    }
    if (written.has(`RESPONSE${num}`)) return;
    if (last && !isStop && !(!current && idle)) return;
    let text = t.trailing.join("\n\n");
    let ts = t.respTime;
    let model = t.respModel || t.model;
    if (last && isStop && !text && input.last_assistant_message) {
      text = input.last_assistant_message;
      ts = new Date().toISOString();
    }
    body += entry("RESPONSE", num, sid, ts || new Date().toISOString(), model, text || NO_RESPONSE);
    written.add(`RESPONSE${num}`);
    appended = true;
  });

  if (!appended) return;
  const models = [...new Set(turns.map((t) => t.model))].join(", ");
  const first = turns[0].promptTime;
  const header =
    `---\nsession_id: ${sid}\ndate: ${first.slice(0, 10)}\nauthor: ${author}\nmodel: ${models}\ntool: claude-code\n` +
    `project: ${project}\ntotal_exchanges: ${turns.length}\nfirst_prompt_time: ${first}\n` +
    `last_prompt_time: ${turns[turns.length - 1].promptTime}\n---\n\n` +
    `# Session Log - ${first.slice(0, 10)}\n\n` +
    `Session: \`${sid.slice(0, 8)}\` | Project: \`${project}\` | Author: \`${author}\`\n\n---\n\n`;
  fs.writeFileSync(logFile, header + body);
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify({ bodyStart: header.length, written: [...written] }));
}

function main() {
  const input = readStdin();
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || path.resolve(__dirname, "..", "..");
  const logDir = path.join(projectDir, ".agent-logs");
  fs.mkdirSync(logDir, { recursive: true });
  try {
    if (!input.transcript_path || !fs.existsSync(input.transcript_path)) return;
    const author = git("config --get github.user", projectDir) || git("config --get user.name", projectDir) || "unknown";
    const project = path.basename(projectDir).toLowerCase();
    const transcriptDir = path.dirname(input.transcript_path);
    const opts = { logDir, author, project, input };
    // Backfill other sessions of this project that the hook never saw (e.g. the one that installed it).
    for (const f of fs.readdirSync(transcriptDir)) {
      const p = path.join(transcriptDir, f);
      if (f.endsWith(".jsonl") && path.resolve(p) !== path.resolve(input.transcript_path)) {
        syncSession(p, { ...opts, current: false });
      }
    }
    syncSession(input.transcript_path, { ...opts, current: true });
  } catch (e) {
    fs.appendFileSync(path.join(logDir, ".capture-errors.log"), `${new Date().toISOString()} ${e.stack}\n`);
  }
}

main();
