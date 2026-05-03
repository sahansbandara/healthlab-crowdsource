# Performance Testing

These Artillery scripts are designed to be safe:

- They target read-only endpoints only.
- They must be run against a local/test environment.
- They should never be pointed at the production `af_Project_DB`.

## Required environment variables

Set these before running the authenticated scenarios:

```powershell
$env:BASE_URL="http://localhost:5000"
$env:PARTICIPANT_TOKEN="your_test_participant_jwt"
$env:RESEARCHER_TOKEN="your_test_researcher_jwt"
$env:SAFE_EXPERIMENT_ID="existing_test_experiment_id"
$env:SAFE_PARTICIPATION_ID="existing_test_participation_id"
```

Use only dedicated test accounts and test data.

## Available scripts

- `npm run test:performance`
- `npm run test:performance:low`
- `npm run test:performance:medium`
- `npm run test:performance:high`
- `npm run test:performance:researcher`

## Direct Artillery commands

```bash
artillery run testing/performance/healthlab-low-load.yml
artillery run testing/performance/healthlab-medium-load.yml
artillery run testing/performance/healthlab-high-load.yml
artillery run testing/performance/healthlab-researcher-read-load.yml
```

## What each script measures

- `healthlab-low-load.yml`
  - Low load at `5 users/sec` for `30s`
  - Public discovery endpoints

- `healthlab-medium-load.yml`
  - Medium load at `15 users/sec` for `45s`
  - Participant flow: experiments -> recommendations -> my studies -> participation detail

- `healthlab-high-load.yml`
  - High load at `35 users/sec` for `60s`
  - Mixed read-heavy flow

- `healthlab-researcher-read-load.yml`
  - Researcher oversight flow with `10 -> 20 users/sec` over `45s`
  - Reviews, participant submission list, experiment-safe reads

## Output metrics

- `response time`
  - How long the API takes to respond. Lower is better.

- `requests per second`
  - How many requests the API serves each second under load.

- `error rate`
  - Percentage of failed requests. For a healthy run, this should stay near `0%`.

## Report generation

After a run, generate HTML reports with:

```bash
npm run test:performance:report:low
npm run test:performance:report:medium
npm run test:performance:report:high
npm run test:performance:report:researcher
```

## Screenshots for your assignment

Good screenshots to take:

1. Terminal output showing phase progression and summary metrics
2. The generated HTML report overview
3. The response-time percentile chart
4. The requests-per-second graph
5. The error-rate section showing safe execution

Use the HTML report in `backend/testing/build/` and capture:

- summary metrics at the top
- latency percentiles
- throughput graph
- failures/errors section
