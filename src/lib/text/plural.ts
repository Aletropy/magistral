/** "1 alteração" / "3 alterações": the count followed by the right form, instead of "alteração(ões)". */
export function plural(count: number, singular: string, pluralForm: string): string {
  return `${count.toLocaleString("pt-BR")} ${count === 1 ? singular : pluralForm}`;
}
