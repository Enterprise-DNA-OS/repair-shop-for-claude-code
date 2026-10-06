# Move repair records from RepairDesk

RepairDesk's [ticket export guide](https://help.repairdesk.co/portal/en/kb/articles/how-can-i-export-repair-tickets-to-excel-format), checked 6 October 2026, documents an Excel .xls export. Filter tickets by status and date, search, then export. Large exports arrive through its export log or email.

Open the workbook in Excel or LibreOffice and save the ticket sheet as UTF-8 CSV. Retain the headers. Convert Created Time to an ISO timestamp with its actual timezone, Due On to YYYY-MM-DD, and money to dot decimals without currency symbols or grouping. Do not guess a timezone or change the underlying values. The CLI intentionally rejects ambiguous dates and decimal formats.

```bash
node scripts/repair.mjs add store --name="Your shop" --country=NZ
node scripts/repair.mjs import repairdesk --file=tickets.csv --store="Your shop" --dry-run
node scripts/repair.mjs import repairdesk --file=tickets.csv --store="Your shop"
```

The import is one command after spreadsheet conversion. Test it in a fresh database first. Compare row counts, original totals and statuses against the export before relying on it. `examples/repairdesk/tickets.csv` is a synthetic fixture using documented headers, not a certified vendor export.

## Mapping

Ticket ID, Devices, Tasks and IMEI/ Serial identify each task row within a store. Customer is retained as a customer snapshot per imported task, because names cannot establish identity. Assigned To becomes the technician. Total becomes the recorded invoice amount; it does not prove payment. Due On and Created Time become the due date and intake time. All original columns, including Price, Discount, Tax and Created By, remain in source_data.

Pending maps to assessment, In Progress or Repairing to repairing, Waiting for Parts to parts, Repaired or Completed to ready, Collected or Delivered to collected, and Cancelled or Canceled to cancelled. Completed does not imply physical collection. Unknown statuses fail the whole import so an operator can map them deliberately. Repeated identical source keys are skipped, preserving local edits. Changed device or task text creates a new key; review changes before reimporting. Duplicate keys within one file fail with no writes.

One export row becomes one repair record. Multi-device text remains text; the importer does not invent a breakdown. Email, phone, device photos, attachments, part usage, payments, acceptance, customer approval, written notices, quality checks and warranty records are not provided by this ticket export and are not fabricated. Ready dates and balances stay unknown. Gather them separately and record evidence before operating imported tickets. Group customer snapshots only after verifying identities.

`export` writes a versioned JSON snapshot of all seven business tables in a consistent transaction. It is a portable backup, not a RepairDesk import file. Keep exports private and test a database restore before cancelling your old service. Keep POS, payment handling and accounting separate until their replacement is explicitly scoped.
