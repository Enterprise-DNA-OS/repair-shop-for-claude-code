# Repair Shop for Claude Code

Your repair bench, parts, collection queue and customer remedy records in a database you own. Built by Enterprise DNA.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free under MIT. Install and change it. | Your fields, rules and RepairDesk records brought across. Counter screens and a different stack can be scoped. | Installed, connected and operated through Omni. One setup fee, then a retainer. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book?offer=replace-software&utm_medium=github&utm_campaign=repairdesk) | [Book a call](https://enterprisedna.co/omni/book?offer=replace-software&utm_medium=github&utm_campaign=repairdesk) |

Works with Claude Code, Codex, OpenCode or Cursor. AGENTS.md points every agent at the same CLAUDE.md and command recipes.

## Quick start

Requires Node 20 or newer. Commands work in Windows PowerShell and Linux shells.

```bash
git clone https://github.com/Enterprise-DNA-OS/repair-shop-for-claude-code.git
cd repair-shop-for-claude-code
npm install
npm test
npm run demo
npm run view
npm run docs
```

The fictional demo has two shops, three customers, nine repairs, three stock parts and two remedy claims. Relative dates expose late bench work, uncollected devices and missing notice evidence. Repeating the seed preserves local edits. Never seed production.

Read-only reports go to views/. Job cards, collection records, AU repair notices and remedy records go to docs-out/. Change brand.json for the business name, colours and logo. Files are private and gitignored. There is no front end, device access, payment processing or automatic messaging. Keep counter POS and accounting separate. See [why no front end](docs/why-no-front-end.md).

## Work from the records

```bash
node scripts/repair.mjs bench
node scripts/repair.mjs ticket R-1003 --json
node scripts/repair.mjs questions 1
node scripts/repair.mjs log R-1003 --actor=Jo --note="Customer confirmed the revised due date"
node scripts/repair.mjs import repairdesk --file=examples/repairdesk/tickets.csv --store="Harbour Repairs" --dry-run
node scripts/repair.mjs export
```

Every command accepts --json. Names are case-insensitive and ids accept unique prefixes. Ambiguity lists matches and exits 1. Money uses exact decimal inputs and integer cents in storage. Each shop keeps its currency; no currency conversion or revenue recognition is implied. Unknown balances stay unknown. Parts contribution excludes labour, tax adjustments and overhead and is not profit.

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

## Ten questions from the records

`questions 1` through `questions 10` answer these today. They demonstrate cross-record analysis, not an unsupported claim that RepairDesk cannot produce similar reports.

1. Which late repairs are waiting for parts?
2. Which customers have not heard from us for a week?
3. Which finished devices have waited a week for collection?
4. Which technicians have overdue work?
5. Which Australian repairs lack notice evidence?
6. Which parts are at their reorder point?
7. Which repairs have recorded parts costs above their invoice?
8. What recorded balance is waiting at each shop?
9. Which customer remedy follow-ups are overdue?
10. Which imported repairs still need approval or condition evidence?

## Your first hour: ten things to ask for

1. Show the bench in promised-date order.
2. Find late work waiting for parts.
3. Show customers we have not contacted for a week.
4. Show devices ready for collection for a week.
5. Prepare the low-stock list by shop.
6. Check Australian repair-notice evidence.
7. Read open customer remedy follow-ups.
8. Draft a pickup reminder for a checked repair.
9. Add a field for the shelf location with /customise.
10. Add a read-only report for overdue work by technician with /new-view.

## Bring RepairDesk records across

The [switch guide](docs/replace-repairdesk.md) explains the documented Excel ticket export and CSV conversion. Import the converted sheet with one command, dry-run first. Customers remain separate snapshots until identities are verified. Original columns are preserved. Missing payments, notices, parts, approvals and quality checks are never inferred. Duplicate source keys skip existing records, preserving local work.

## Database and evidence

Seven business tables, four SQL views, update triggers and transactional stock usage run on PGlite or PostgreSQL. Embedded data is in .data/db; DATA_DIR selects another location. DATABASE_URL selects a shared private database. Its owner configures roles, TLS, backups and access. This base has no web login or tenant boundary. One embedded process runs at a time.

[Compliance checks](docs/compliance.md) cite ACCC repair-notice guidance and NZ service guarantees. They flag evidence gaps and chosen internal deadlines. They do not decide legal compliance or deny claims when a shop warranty expires. New AU approvals require notice evidence before acceptance; collection requires recorded quality checks.

npm test uses a temporary embedded database, exercises workflows, failure paths and imports, and renders the reports and documents. The CI matrix covers Windows and Linux on Node 20 and 22. See docs/validation.md for what was actually run locally. Changes belong in new migrations with a command recipe and meaningful assertions.

MIT licence. [Enterprise DNA](https://enterprisedna.co/omni/book?offer=replace-software&utm_medium=github&utm_campaign=repairdesk).
