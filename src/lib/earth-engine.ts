export type EarthEngineStatus = { ok: true }

export async function checkEarthEngineServer(): Promise<EarthEngineStatus> {
  const response = await fetch('/api/earth-engine/status')
  if (!response.ok) throw new Error('Earth Engine server check failed')
  return response.json() as Promise<EarthEngineStatus>
}
