export const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
} as const

export async function readJsonBody(request: Request): Promise<unknown | null> {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(contentLength) && contentLength > 16_384) return null

  try {
    const body = await request.text()
    if (body.length > 16_384) return null
    return JSON.parse(body) as unknown
  } catch {
    return null
  }
}
