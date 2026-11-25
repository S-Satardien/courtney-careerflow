import fs from 'fs';
import path from 'path';
import { runWesternCapeDiscovery } from '../src/services/scrapers/aggregator';

/**
 * Runs a full live scrub across all 36 monitored Southern Suburbs schools,
 * direct NPOs/NGOs, and South African job boards, excludes past-deadline &
 * non-English/LO teaching roles, and exports a clean static snapshot to
 * `public/data/jobs.json` for GitHub Pages hosting.
 */
async function main() {
  const jobs = await runWesternCapeDiscovery(true);
  const outPath = path.join(process.cwd(), 'public', 'data', 'jobs.json');
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    totalActive: jobs.length,
    jobs,
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');
  process.stdout.write(`Exported ${jobs.length} open Southern Suburbs roles to ${outPath}\n`);
}

main().catch((err) => {
  process.stderr.write(`Sync failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
