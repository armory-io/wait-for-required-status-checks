import * as core from '@actions/core'
export async function wait(milliseconds: number): Promise<string> {
  return new Promise(resolve => {
    if (isNaN(milliseconds)) {
      throw new Error('milliseconds not a number')
    }

    setTimeout(() => resolve('done!'), milliseconds)
  })
}

export const retry = async <T> (attempts: number, fn: () => Promise<T>): Promise<T> => {
  while (true) {
    attempts -= 1
    try {
      return await fn()
    } catch (e) {
      if (attempts < 0) {
        throw e
      }
      core.info(`Attempt failed, ${attempts} attempts remaining: ${e.message}`)
    }
    await wait(1000)
  }
}
