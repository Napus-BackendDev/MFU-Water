import handler from './samples.js'

export default async function pendingHandler(request, response) {
  return handler(request, response)
}
