# Bring RepairDesk ticket rows across

Read CLAUDE.md. Run `node scripts/repair.mjs import repairdesk --file=tickets.csv --store="<shop>" --dry-run --json`. Replace placeholders with verified record values. Read the full ticket before writing. Resolve ambiguous names using the listed ids.

Read docs/replace-repairdesk.md. Convert the workbook to the documented CSV format, dry-run in a fresh database, inspect counts and gaps, then remove --dry-run. No automatic customer merging.

Present the records in plain language. Do not invent missing facts. Drafts stay in drafts/ and never send.
