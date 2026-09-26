// Publishes what Changesets reports as unpublished, then creates the git tags.
// Uses the npm CLI because npm trusted publishing rejects pnpm 12's native publish
// with "403 OIDC permission denied for this action".
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const planFile = join(mkdtempSync(join(tmpdir(), 'socketto-release-')), 'plan.json')
execFileSync('pnpm', ['exec', 'changeset', 'publish-plan', '--output', planFile], {
  stdio: 'inherit'
})

const steps = JSON.parse(readFileSync(planFile, 'utf8')).plan.flat()
if (steps.length === 0) {
  process.stdout.write('Nothing to publish or tag.\n')
  process.exit(0)
}

if (steps.some((step) => step.kind === 'publish')) {
  execFileSync('npm', ['publish'], { stdio: 'inherit' })
}
// reports new tags to changesets/action through CHANGESETS_OUTPUT, which creates the GitHub release
execFileSync('pnpm', ['exec', 'changeset', 'git-tag'], { stdio: 'inherit' })
