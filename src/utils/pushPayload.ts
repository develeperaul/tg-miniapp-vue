type JsonObject = Record<string, unknown>
type Identifier = string | number

function object(value: unknown): JsonObject | null {
  if (typeof value === 'string' && value.length <= 100_000 && value.trim().startsWith('{')) {
    try { value = JSON.parse(value) } catch { return null }
  }
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonObject : null
}

function identifier(value: unknown): value is Identifier {
  return (typeof value === 'string' && !!value.trim()) ||
    (typeof value === 'number' && Number.isFinite(value))
}

/** Accept both FCM data strings and the legacy { data: { message, chat_id } } body. */
export function normalizePushPayload(payload: unknown) {
  const records: JsonObject[] = []
  const visited = new Set<object>()
  const bodyFallbacks: { value: unknown; depth: number }[] = []
  function visit(value: unknown, depth: number) {
    if (depth > 5) return
    const record = object(value)
    if (!record || visited.has(record)) return
    visited.add(record)
    // Preserve canonical fields copied into Android click extras before nested legacy data.
    records.push(record)
    visit(record.data, depth + 1)
    visit(record.notification, depth + 1)
    bodyFallbacks.push({ value: record.body, depth: depth + 1 })
  }
  visit(payload, 0)
  // Finish explicit fields throughout the envelope before considering serialized bodies.
  for (let index = 0; index < bodyFallbacks.length; index++) {
    const fallback = bodyFallbacks[index]!
    visit(fallback.value, fallback.depth)
  }
  const firstId = (keys: string[]) => {
    for (const record of records) for (const key of keys) {
      if (identifier(record[key])) return record[key] as Identifier
    }
    return undefined
  }
  const firstText = (key: string) => {
    for (const record of records) if (typeof record[key] === 'string') return record[key] as string
    return undefined
  }
  return {
    chatId: firstId(['chatId', 'chat_id']),
    messageId: firstId(['messageId', 'message_id']),
    url: firstText('url'),
    message: firstText('message') ?? firstText('body') ?? '',
  }
}
