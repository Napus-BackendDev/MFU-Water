import { respond } from '../surveys/_shared.js'
import { buildAdminQueue } from '../surveys/_db.js'
import { adminEndpoint } from './_admin_shared.js'

export default adminEndpoint('GET', async (_request, response, settings) => respond(response, 200, await buildAdminQueue(settings)))
