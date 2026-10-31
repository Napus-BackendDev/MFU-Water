import { respond } from '../surveys/_shared.js'
import {
  createAdminNewsHandler,
  deleteAdminNewsHandler,
  getAdminNewsHandler,
  toggleAdminPinHandler,
  updateAdminNewsHandler,
  uploadAdminNewsPhotoHandler,
} from './_admin.js'
import newsPhotoHandler from './_photo.js'
import publicNewsHandler from './_public.js'

// The only Vercel function for all news endpoints (Hobby allows 12 functions in total).
// vercel.json rewrites every /api/news/* and /api/admin/news/* URL here with a ?route= hint;
// Express (local development) calls the handlers directly.
const adminByMethod = {
  GET: getAdminNewsHandler,
  POST: createAdminNewsHandler,
  PUT: updateAdminNewsHandler,
  DELETE: deleteAdminNewsHandler,
}

export function pickNewsHandler(request) {
  switch (request.query?.route) {
    case 'photo': return newsPhotoHandler
    case 'admin-upload': return uploadAdminNewsPhotoHandler
    case 'admin-pin': return toggleAdminPinHandler
    case 'admin': return adminByMethod[request.method]
    default: return publicNewsHandler
  }
}

export default async function handler(request, response) {
  const handle = pickNewsHandler(request)
  if (!handle) {
    response.setHeader('Allow', Object.keys(adminByMethod).join(', '))
    return respond(response, 405, { error: 'Method not allowed' })
  }
  return handle(request, response)
}
