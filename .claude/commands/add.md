# Add a shop, customer, part or claim

Read CLAUDE.md. Run `node scripts/repair.mjs add customer --name="<name>" --json`. Replace placeholders with verified record values. Read the full ticket before writing. Resolve ambiguous names using the listed ids.

Other types: add store --name=... --country=NZ|AU; add part --store=... --sku=... --name=... --quantity=... --reorder=... --cost=...; add claim --ticket=... --issue=... --due=YYYY-MM-DD.

Present the records in plain language. Do not invent missing facts. Drafts stay in drafts/ and never send.
