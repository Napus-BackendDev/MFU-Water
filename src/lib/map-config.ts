export type MapConfig = {
  id: string
  slug: string
  name: string
  description: string | null
  config: Record<string, unknown>
  is_published: boolean
}

export function parseMapConfig(value: unknown): MapConfig | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>

  if (
    typeof row.id !== 'string' ||
    typeof row.slug !== 'string' ||
    typeof row.name !== 'string' ||
    (row.description !== null && typeof row.description !== 'string') ||
    !row.config || typeof row.config !== 'object' || Array.isArray(row.config) ||
    typeof row.is_published !== 'boolean'
  ) return null

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    config: row.config as Record<string, unknown>,
    is_published: row.is_published,
  }
}
