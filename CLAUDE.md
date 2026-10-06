# Repair Shop for Claude Code: operating instructions

Fictional Harbour Repairs in New Zealand and Westside Repairs in Australia demonstrate device intake, repair work, stock and customer remedy follow-ups. Replace this context with the actual business before using live records.

Read `scripts/repair.mjs` output before answering. Run `node scripts/repair.mjs help --json` for capabilities. Use the same recipes from any coding agent. Unique id prefixes and case-insensitive names work; ambiguous matches list candidates and fail.

| Job | Recipe |
|---|---|
| The morning bench queue | `/bench` |
| All repair records | `/tickets` |
| One repair with its history | `/ticket` |
| Customer snapshots | `/customers` |
| Repairs waiting for parts | `/parts-due` |
| Devices ready for pickup | `/collections` |
| Parts at reorder point | `/stock-check` |
| Stock holdings | `/parts` |
| Warranty dates and remedy claims | `/warranties` |
| Customer remedy follow-ups | `/claims` |
| Missing evidence and late follow-ups | `/compliance` |
| Late work and quiet customers | `/attention` |
| Recorded values by store and currency | `/metrics` |
| Ten analyses from the records | `/questions` |
| Monday repair review | `/weekly-review` |
| Assess an incoming device | `/intake` |
| Add a shop, customer, part or claim | `/add` |
| Record a repair event | `/log` |
| Record delivery of a written repair notice | `/notice` |
| Record customer approval and acceptance | `/approve` |
| Start approved bench work | `/start` |
| Place active work on parts hold | `/await-parts` |
| Record workmanship checks before pickup | `/quality-check` |
| Record physical handover | `/collect` |
| Consume stock on a repair | `/use-part` |
| Record physical stock receipt | `/receive-part` |
| Record an agreed remedy outcome | `/resolve-claim` |
| Update evidence and recorded amounts | `/update` |
| Draft a collection reminder | `/draft-pickup` |
| Bring RepairDesk ticket rows across | `/import` |
| Write a portable private backup | `/export` |
| Change the workflow | `/customise` |
| Add a read-only report | `/new-view` |
| Prepare paperwork | `/documents` |

Never send messages, process payments, access device contents or dispose of devices. Draft to drafts/. Keep passwords and device passcodes out of all records. Do not infer consent or backdate evidence. AU notices precede acceptance. Quality checks precede collection. Record physical actions only after they happened. Warranty dates never remove consumer rights.

Money is integer cents with currency per shop. Dates use each shop's timezone. Invoice and payment amounts are manually recorded snapshots. Imports leave missing evidence and balances unknown. Read docs/replace-repairdesk.md and docs/compliance.md before those jobs.

Embedded PGlite supports one process at a time. DATABASE_URL selects PostgreSQL with the access of the supplied database role. Its owner sets private networking, roles, backups and retention. No web login or tenant isolation is provided. Never seed a real business database. All changes use new migrations and npm test. Keep customer data, drafts, views and exports out of git.

Enterprise DNA customises and runs this through Omni: https://enterprisedna.co/omni/book?offer=replace-software&utm_medium=github&utm_campaign=repairdesk
