# Capture Test

## Tool and model

- Tool: Claude Code (VS Code extension), on Windows 11
- Model: `claude-opus-5-5` (Opus 5.5) for both planning and execution. No separate planner model, no subagents.

## Mechanism

Claude Code hooks, configured in [.claude/settings.json](.claude/settings.json). Two events run the same script, [.claude/hooks/capture.js](.claude/hooks/capture.js):

- `UserPromptSubmit`: fires on every prompt
- `Stop`: fires at the end of every turn and receives the session transcript path on stdin

The script reads the session transcript (`~/.claude/projects/<project>/<session-id>.jsonl`) and appends to `.agent-logs/YYYY-MM-DD_HH-MM-SS_<session-id>.md`:

- each user prompt, verbatim
- the final assistant text of each turn (the text after the last tool call)

Thinking, tool calls, tool results and intermediate text are skipped. Each entry carries a UTC timestamp and the model name. The script only appends. To avoid writing an entry twice, it tracks what it has already written in `.agent-logs/.state/<session-id>.json`. Errors would go to `.agent-logs/.capture-errors.log`, and that file has never been created.

Prompts are written when the turn ends, not when they are submitted. When `UserPromptSubmit` fires, the prompt is not in the transcript yet, so the `Stop` hook writes the prompt and the response together.

## Log files the canaries landed in

| Canary | Session | Log file |
|---|---|---|
| 1 | `0f653185-723d-415f-8aea-5b39f0b7e677` | `.agent-logs/2026-10-03_19-50-04_0f653185-723d-415f-8aea-5b39f0b7e677.md` |
| 2 | `86eeb55e-e828-43d6-b2f0-187744c46b95` | `.agent-logs/2026-10-03_19-58-48_86eeb55e-e828-43d6-b2f0-187744c46b95.md` |

These are two separate Claude Code sessions. The second one was started fresh after the hook was installed, and it logged on its own with no setup in that session. I checked every prompt and final response in both log files against the raw session transcripts, and they all match exactly.

The canary wording differs from the brief's `CAPTURE TEST — 8x assignment, <name>`. Canary 1 was `CAPTURE TEST — Jawad Ali`. Canary 2 was `CAPTURE TEST — second session, Jawad Ali`. Canary 1 was also sent a second time in the same session (prompt 3 of `0f653185`). That second send does not count as the cross-session test.

## Canary 1 (raw)

```
[LOG_ENTRY type=PROMPT num=2 session=0f653185]
timestamp: 2026-10-03T19:54:26.550Z
model: claude-opus-5-5

CAPTURE TEST — Jawad Ali


[LOG_ENTRY type=RESPONSE num=2 session=0f653185]
timestamp: 2026-10-03T19:54:57.169Z
model: claude-opus-5-5

The canary isn't in the log yet, so I can't confirm it landed. Setup is otherwise going as expected:

- **First prompt (the brief):** the hook logged it automatically, word for word. It had arrived before the hook existed.
- **My first reply:** the real `Stop` hook logged it in full, timestamped `19:53:59Z`. No errors.
- **Your canary:** logged prompts are written when the turn ends, because the prompt isn't in the transcript yet when `UserPromptSubmit` fires. So the canary goes into [.agent-logs/2026-10-03_19-50-04_0f653185-723d-415f-8aea-5b39f0b7e677.md](.agent-logs/2026-10-03_19-50-04_0f653185-723d-415f-8aea-5b39f0b7e677.md) when this turn finishes. A dry run on a scratch copy wrote it as `PROMPT num=2` with timestamp `19:54:26.550Z` and model `claude-opus-5-5`. I'll check the real file at the start of my next reply.

Next steps:

1. **Start a new Claude Code session in this folder and send the second canary.** Your canary here was `CAPTURE TEST — Jawad Ali`; the brief's wording is `CAPTURE TEST — 8x assignment, Jawad Ali`. That's probably fine, but you may want the exact wording for the second one.
2. Come back to this session and tell me it's sent. I'll check that both sessions logged a prompt and a response, write `CAPTURE-TEST.md` with both entries pasted raw, and make the first commit.

I still need your GitHub handle for the `author` field. It currently shows "Jawad Ali", from your git name.
```

## Canary 2 (raw)

```
[LOG_ENTRY type=PROMPT num=1 session=86eeb55e]
timestamp: 2026-10-03T19:58:48.687Z
model: claude-opus-5-5

<ide_opened_file>The user opened the file d:\Projects\AmazonClone\.claude\settings.json in the IDE. This may or may not be related to the current task.</ide_opened_file>

CAPTURE TEST — second session, Jawad Ali


[LOG_ENTRY type=RESPONSE num=1 session=86eeb55e]
timestamp: 2026-10-03T19:58:52.256Z
model: claude-opus-5-5

Got it, I'm here for the capture test. It's the second session, with Jawad Ali as the git user, in `d:\Projects\AmazonClone` on `main`. The repo has no commits yet, and `.agent-logs/`, `.claude/` and `.gitignore` aren't tracked.

The Google Drive connector needs authorization before its tools will work. You can authorize it in your claude.ai connector settings.

What do you want to do next?
```

## What did not work first

- My first version of `capture.js` worked out which entries were already logged by scanning the log file for `[LOG_ENTRY ...]` lines. The first prompt was this assignment brief, and the brief itself contains example entries in that exact format. The script took those examples as real entries, decided the responses had already been logged, and wrote nothing. I replaced the scan with the separate state file in `.agent-logs/.state/`.
- The first prompt (the brief) arrived before any hook existed. On its first run, the script backfills sessions it never saw from their transcripts, so that prompt and its response were still logged verbatim.
- Logging the prompt from the `UserPromptSubmit` payload alone would have meant the prompt and response were written at different times, from different sources. Reading both from the transcript in the `Stop` hook keeps them consistent.
