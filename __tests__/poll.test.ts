import {poll} from '../src/poll'

const client: any = {
  checks: {
    listForRef: jest.fn()
  }
}

const run = (checks: string[]) =>
  poll({
    client,
    checks,
    timeoutSeconds: 3,
    intervalSeconds: 1,
    owner: 'danielpeach',
    repo: 'pf4jStagePlugin',
    ref: 'refs/heads/master'
  })

test('returns conclusion of completed check', async () => {
  client.checks.listForRef.mockResolvedValue({
    data: {
      check_runs: [
        {
          id: '1',
          name: 'integration-test',
          status: 'completed'
        }
      ]
    }
  })

  const result = await run(['integration-test'])

  expect(result).toBe('success')
  expect(client.checks.listForRef).toHaveBeenCalledWith({
    owner: 'danielpeach',
    repo: 'pf4jStagePlugin',
    ref: 'refs/heads/master'
  })
})

test('polls until check is completed', async () => {
  client.checks.listForRef
    .mockResolvedValueOnce({
      data: {
        check_runs: [
          {
            id: '1',
            name: 'integration-test',
            status: 'pending'
          }
        ]
      }
    })
    .mockResolvedValueOnce({
      data: {
        check_runs: [
          {
            id: '1',
            name: 'integration-test',
            status: 'pending'
          }
        ]
      }
    })
    .mockResolvedValueOnce({
      data: {
        check_runs: [
          {
            id: '1',
            name: 'integration-test',
            status: 'completed'
          }
        ]
      }
    })

  const result = await run(['integration-test'])

  expect(result).toBe('success')
  expect(client.checks.listForRef).toHaveBeenCalledTimes(3)
})

test(`returns "timed_out" if exceeding deadline`, async () => {
  client.checks.listForRef.mockResolvedValue({
    data: {
      check_runs: [
        {
          id: '1',
          name: 'integration-test',
          status: 'pending'
        }
      ]
    }
  })

  const result = await run(['integration-test'])
  expect(result).toBe('timed_out')
})
