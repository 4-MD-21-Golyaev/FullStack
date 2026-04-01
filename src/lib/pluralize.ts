/**
 * Returns "N товар/товара/товаров" using Russian pluralization rules.
 */
export function pluralizeItems(n: number): string {
  const abs = Math.abs(n);
  const lastTwo = abs % 100;
  const lastOne = abs % 10;

  if (lastTwo >= 11 && lastTwo <= 19) return `${n} товаров`;
  if (lastOne === 1) return `${n} товар`;
  if (lastOne >= 2 && lastOne <= 4) return `${n} товара`;
  return `${n} товаров`;
}
