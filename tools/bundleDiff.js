const path = require('path')
const github = require('@actions/github')
const core = require('@actions/core')
const { diff, generateReport } = require('webpack-bundle-diff')

async function run() {
  try {
    const stats = {
      base: require(path.resolve(process.cwd(), process.env.baseStatsPath)),
      head: require(path.resolve(process.cwd(), process.env.headStatsPath)),
    }

    // The first column of the table indicates whether modules were added (+), removed (-), or changed (△). Modules with only minor changes (possibly due to internal webpack heuristics) are aggregated together in the last row of the table.
    // One module may cause a whole subgraph of dependencies to get included in the bundle. The Count indicates how many modules were included due to this module.
    // Size is the total change in size due to this module and any dependencies it brings in.
    const summaryTable = generateReport(diff(stats.base, stats.head))
    console.info(summaryTable)
    const { size } = stats.head.assets[0]
    if (process.env.gitToken) {
      const octokit = github.getOctokit(process.env.gitToken)

      const pullRequestId = github.context.issue.number
      if (!pullRequestId) {
        throw new Error('Cannot find the PR id.')
      }

      await octokit.issues.createComment({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: pullRequestId,
        body: `## Bundle size ${size} bytes.\r\n${summaryTable}`,
      })
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
