import { endasCardParser } from "./endas"
import type { CardEntity, CardParseResult, CardParser } from "./types"

export * from "./types"
export { endasCardParser }

// Enti di cui sappiamo leggere il PDF. CSEN non c'è ancora: il PDF ha un
// tracciato suo e va scritto un parser suo, da registrare qui. Il resto del
// sistema non cambia.
export const CARD_PARSERS: Partial<Record<CardEntity, CardParser>> = {
  ENDAS: endasCardParser,
}

export const SUPPORTED_CARD_ENTITIES = Object.keys(
  CARD_PARSERS,
) as CardEntity[]

export function cardParserFor(entity: CardEntity): CardParser | null {
  return CARD_PARSERS[entity] ?? null
}

export function parseCardText(
  entity: CardEntity,
  text: string,
): CardParseResult {
  const parser = cardParserFor(entity)
  if (!parser) return { ok: false, reason: "OTHER_ENTITY" }
  return parser.parse(text)
}
