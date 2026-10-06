# Validation

6 October 2026, Linux, Node 22.23.1:

- npm install completed.
- npm test passed 60 assertions using a disposable embedded database.
- npm run demo completed with nine fictional repairs.
- npm run view rendered four read-only reports.
- npm run docs rendered 30 documents across four document types.
- README and compliance guide passed the Enterprise DNA brand linter. All authored prose was checked for placeholders, em dashes and banned terms.

The test suite exercises all business reads, ten analyses, ticket intake and approval, written notice evidence, stock consumption and rollback, repair state changes, quality and collection, customer remedies, drafts, imports, exports and rendered output. It checks unknown balances, invalid dates and money, ambiguous names and transaction rollback after an invalid import row.

GitHub Actions defines Windows and Linux checks on Node 20 and 22, plus the same suite against PostgreSQL 17 using an isolated temporary schema selected explicitly with TEST_DATABASE_URL. Local testing did not use a PostgreSQL server. CI results are available on the repository's Actions tab after the private push.
