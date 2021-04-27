import fetch from 'cross-fetch'
import * as query from '../src/query'
import * as util from './util'
import * as errors from '../src/errors'

describe('auth', () => {
  describe('AccessProvider Auth0', () => {
    const headers = {
      'Content-Type': 'application/json',
    }

    function getAuth0Token(params) {
      return fetch(`${util.testConfig.auth0uri}oauth/token`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...params,
          grant_type: 'client_credentials',
        }),
      })
        .then(resp => resp.json())
        .then(data => data.access_token)
    }
    const providerName = util.randomString('provider_')
    const roleOneName = util.randomString('role_one_')

    let resource
    let authClient
    let grants
    let clientWithAuth0Token

    beforeAll(async () => {
      const adminToken = await getAuth0Token({
        client_id: util.testConfig.auth0clientId,
        client_secret: util.testConfig.auth0clientSecret,
        audience: `${util.testConfig.auth0uri}api/v2/`,
      })
      headers.authorization = `Bearer ${adminToken}`
      await util.client().query(
        query.CreateRole({
          name: roleOneName,
          privileges: [
            {
              resource: query.Roles(),
              actions: { read: true },
            },
          ],
        })
      )

      const provider = await util.client().query(
        query.CreateAccessProvider({
          name: providerName,
          issuer: util.testConfig.auth0uri,
          jwks_uri: `${util.testConfig.auth0uri}.well-known/jwks.json`,
          roles: [query.Role(roleOneName)],
        })
      )

      resource = await fetch(
        `${util.testConfig.auth0uri}api/v2/resource-servers`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: providerName,
            identifier: provider.audience,
            signing_alg: 'RS256',
          }),
        }
      ).then(resp => resp.json())

      authClient = await fetch(`${util.testConfig.auth0uri}api/v2/clients`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: providerName,
          app_type: 'non_interactive',
          is_first_party: true,
          oidc_conformant: true,
          jwt_configuration: { alg: 'RS256', lifetime_in_seconds: 36000 },
          token_endpoint_auth_method: 'client_secret_post',
          grant_types: ['client_credentials'],
        }),
      }).then(resp => resp.json())

      grants = await fetch(`${util.testConfig.auth0uri}api/v2/client-grants`, {
        method: 'POST',
        json: true,
        headers,
        body: JSON.stringify({
          audience: provider.audience,
          client_id: authClient.client_id,
          scope: [],
        }),
      }).then(resp => resp.json())

      clientWithAuth0Token = util.getClient({
        secret: await getAuth0Token({
          client_id: authClient.client_id,
          client_secret: authClient.client_secret,
          audience: provider.audience,
        }),
      })
    })

    test('auth0 setup', () => {
      expect(authClient.error).toBeUndefined()
      expect(resource.error).toBeUndefined()
      expect(grants.error).toBeUndefined()
    })

    test('should have read access for Roles', async () => {
      const res = await clientWithAuth0Token.query(
        query.Get(query.Role(roleOneName))
      )
      expect(res.name).toEqual(roleOneName)
    })

    test("shouldn't have write access for Roles", async () => {
      const res = await clientWithAuth0Token
        .query(query.CreateRole({ name: `permission_deny${roleOneName}` }))
        .catch(err => err)
      expect(res).toBeInstanceOf(errors.PermissionDenied)
    })

    afterAll(() => {
      return Promise.all([
        fetch(
          `${util.testConfig.auth0uri}api/v2/resource-servers/${resource.id}`,
          {
            headers,
            method: 'DELETE',
          }
        ),
        fetch(
          `${util.testConfig.auth0uri}api/v2/clients/${authClient.client_id}`,
          {
            headers,
            method: 'DELETE',
          }
        ),
        fetch(`${util.testConfig.auth0uri}api/v2/client-grants/${grants.id}`, {
          headers,
          method: 'DELETE',
        }),
      ])
    })
  })
})
