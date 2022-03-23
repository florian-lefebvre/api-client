/*
 * @japa/api-client
 *
 * (c)
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'

import { ApiClient } from '../../src/Client'
import { ApiRequest } from '../../src/Request'
import { httpServer } from '../../test-helpers'
import { ApiResponse } from '../../src/Response'
import { RequestConfig } from '../../src/Contracts'

test.group('API client | request', (group) => {
  group.each.setup(async () => {
    await httpServer.create()
    return () => httpServer.close()
  })

  test('make { method } request using api client')
    .with<{ method: RequestConfig['method'] }[]>([
      { method: 'GET' },
      { method: 'POST' },
      { method: 'PUT' },
      { method: 'PATCH' },
      { method: 'DELETE' },
      { method: 'HEAD' },
      { method: 'OPTIONS' },
    ])
    .run(async ({ assert }, { method }) => {
      let requestMethod: RequestConfig['method']
      let requestEndpoint: string

      httpServer.onRequest((req, res) => {
        requestMethod = method
        requestEndpoint = req.url!
        res.end('handled')
      })

      const request = new ApiClient(httpServer.baseUrl)[method.toLowerCase()]('/')
      const response = await request

      assert.equal(requestMethod!, method)
      assert.equal(requestEndpoint!, '/')

      if (method !== 'HEAD') {
        assert.equal(response.text(), 'handled')
      }
    })

  test('register global setup hooks using the ApiClient', async ({ assert }) => {
    const stack: string[] = []

    httpServer.onRequest((_, res) => {
      res.end('handled')
    })

    ApiClient.setup(async (req) => {
      assert.instanceOf(req, ApiRequest)
      stack.push('setup')
      return () => stack.push('setup cleanup')
    })

    const request = new ApiClient(httpServer.baseUrl).get('/')
    await request

    assert.deepEqual(stack, ['setup', 'setup cleanup'])
  })

  test('register global teardown hooks using the ApiClient', async ({ assert }) => {
    const stack: string[] = []

    httpServer.onRequest((_, res) => {
      res.end('handled')
    })

    ApiClient.setup(async (req) => {
      assert.instanceOf(req, ApiRequest)
      stack.push('setup')
      return () => stack.push('setup cleanup')
    })

    ApiClient.teardown((res) => {
      assert.instanceOf(res, ApiResponse)
      stack.push('teardown')
      return () => stack.push('teardown cleanup')
    })

    const request = new ApiClient(httpServer.baseUrl).get('/')
    await request

    assert.deepEqual(stack, ['setup', 'setup cleanup', 'teardown', 'teardown cleanup'])
  })
})
