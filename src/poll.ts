import * as core from '@actions/core'
import {Octokit} from '@octokit/rest'
import {wait} from './wait'

export interface Options {
  client: Octokit
  checks: string[]
  pullRequestNumber: number
  timeoutSeconds: number
  intervalSeconds: number
  owner: string
  repo: string
  ref: string
}

type Outcome = 'success' | 'timed_out'

export const poll = async (options: Options): Promise<Outcome> => {
  const {
    client,
    pullRequestNumber,
    timeoutSeconds,
    intervalSeconds,
    owner,
    repo,
    ref,
    checks
  } = options

  let now = new Date().getTime()
  const deadline = now + timeoutSeconds * 1000

  while (now <= deadline) {
    core.info(
      `Retrieving checks ${checks.join(', ')} on ${owner}/${repo}@${ref}...`
    )
    const {
      data: {check_runs: checkRuns}
    } = await client.checks.listForRef({
      owner,
      repo,
      ref
    })

    const checkRunsForPR = checkRuns.filter(checkRun => checkRun.pull_requests.some(pr => pr.number === pullRequestNumber))
    const completedChecks = checks.filter(check =>
      checkRunsForPR.some(
        checkRun => checkRun.name === check && checkRun.status === 'completed'
      )
    )

    if (completedChecks.length === checks.length) {
      core.info(`All checks (${checks.join(', ')}) are done`)
      return 'success'
    }

    core.info(
      `Waiting for checks to complete (${diff(checks, completedChecks).join(
        ', '
      )})`
    )
    core.info(`Waiting for ${intervalSeconds} seconds...`)
    await wait(intervalSeconds * 1000)

    now = new Date().getTime()
  }

  core.info(`No completed checks after ${timeoutSeconds} seconds, exiting`)
  return 'timed_out'
}

const diff = (left: string[], right: string[]): string[] =>
  left.filter(el => !right.includes(el))
