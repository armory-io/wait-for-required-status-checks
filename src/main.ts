import * as core from '@actions/core'
import {context} from '@actions/github'
import {Octokit} from '@octokit/rest'
import {poll} from './poll'
import {retry} from './wait'

async function run(): Promise<void> {
  try {
    const token = core.getInput('token', {required: true})
    const client = new Octokit({auth: token})

    const [owner, repo] = process.env['GITHUB_REPOSITORY']?.split('/') ?? []
    if (!owner || !repo) {
      core.setFailed('Could not resolve owner/repo')
      return
    }
    const pullRequestNumber = +core.getInput('pull_request_number', {
      required: true
    })

    const {ref, checks} = await resolve(client, owner, repo, pullRequestNumber)
    if (checks.length === 0) {
      core.info('No required status checks, not waiting')
      return
    }

    const result = await poll({
      client,
      checks,
      pullRequestNumber,
      owner,
      repo,
      ref,
      timeoutSeconds: +core.getInput('timeoutSeconds') || 600,
      intervalSeconds: +core.getInput('intervalSeconds') || 10
    })
    core.setOutput('conclusion', result)
  } catch (error) {
    core.setFailed(error.message)
  }
}

export const resolve = async (
  client: Octokit,
  owner: string,
  repo: string,
  pullRequestNumber: number
): Promise<{ref: string; checks: string[]}> => {
   core.info(`Fetching PR #${pullRequestNumber} from ${owner}/${repo}`)
   const { data: pullRequest } = await client.pulls.get({
    owner,
    repo,
    pull_number: pullRequestNumber
  })

  const {data: branchProtection} = await client.repos.getBranchProtection({
    owner,
    repo,
    branch: pullRequest.base.ref
  })
  return {
    ref: pullRequest.head.ref,
    checks: branchProtection.required_status_checks?.contexts ?? []
  }
}

run()
