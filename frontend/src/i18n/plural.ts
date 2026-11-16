const roRules = new Intl.PluralRules('ro-RO')

/**
 * Romanian counts: "1 zi", "3 zile", "20 de zile", "101 zile".
 * Numbers whose last two digits are 20 or more take "de".
 */
export function roPlural(n: number, one: string, few: string): string {
  const category = roRules.select(n)
  if (category === 'one') return `${n} ${one}`
  if (category === 'few') return `${n} ${few}`
  return `${n} de ${few}`
}

export function enPlural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}
