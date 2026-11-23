/** Comprueba que cada anillo de cobertura abarque más distancia que el anterior. */
export function radiosCumplenJerarquia(zona: {
  radio_good: number;
  radio_medio: number;
  radio_bad: number;
}): boolean {
  return (
    zona.radio_good < zona.radio_medio && zona.radio_medio < zona.radio_bad
  );
}
