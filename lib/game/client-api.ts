function isDeleteArgument(value: unknown): value is { method: 'DELETE' } {
  return typeof value === 'object' && value !== null && 'method' in value && value.method === 'DELETE'
}

export async function gameFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error('Request failed')
  return (await response.json()) as T
}

export async function gameMutation<Data = unknown, Argument = unknown>(
  url: string,
  { arg }: { arg: Argument },
): Promise<Data> {
  const method = isDeleteArgument(arg) ? 'DELETE' : 'POST'
  const response = await fetch(url, {
    method,
    headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
    body: method === 'POST' ? JSON.stringify(arg) : undefined,
  })
  const payload = (await response.json().catch(() => null)) as { error?: string } | null
  if (!response.ok) throw new Error(payload?.error ?? 'Request failed')
  return payload as Data
}
