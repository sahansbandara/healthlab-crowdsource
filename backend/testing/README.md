# Testing (Admin + Community)

This folder contains testing assets for your admin/community scope.

## Structure

- `unit/`: isolated tests for functions/services
- `integration/`: API + controller + service + MongoDB interaction tests
- `performance/`: load tests (Artillery)
- `build/`: generated test artifacts (performance reports)

## Run

From `backend/`:

```bash
npm install
npm run test:unit
npm run test:integration
npm run test:performance
npm run test:performance:report
```

## Notes

- Integration tests use `mongodb-memory-server` (ephemeral in-memory DB).
- Performance test output is written to `testing/build/artillery-report.json`.
