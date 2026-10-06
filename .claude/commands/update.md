# Update evidence and recorded amounts

Read CLAUDE.md. Run `node scripts/repair.mjs update <ref> --actor="<name>" --due=2026-10-20 --json`. Replace placeholders with verified record values. Read the full ticket before writing. Resolve ambiguous names using the listed ids.

Supported options: --due=YYYY-MM-DD, --technician=name, --condition=text, --invoice=decimal, --paid=decimal, --contact=ISO-timestamp, --warranty=YYYY-MM-DD. Amounts are recorded snapshots, not payment actions.

Present the records in plain language. Do not invent missing facts. Drafts stay in drafts/ and never send.
