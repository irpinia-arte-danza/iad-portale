// La categoria su cui si apre il Cestino: la prima che ha qualcosa dentro,
// nell'ordine delle schede. null = cestino vuoto del tutto.
export function firstCategoryWithItems(
  categories: { key: string; count: number }[],
): string | null {
  return categories.find((c) => c.count > 0)?.key ?? null
}
