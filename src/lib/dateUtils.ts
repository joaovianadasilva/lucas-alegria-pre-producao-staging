/**
 * Utilitários de data para manipulação sem problemas de timezone
 * Trabalha com datas como strings YYYY-MM-DD e objetos Date no timezone local
 */

/**
 * Converte string ISO (YYYY-MM-DD) para Date local sem conversão de timezone
 * @param isoDateString - String no formato YYYY-MM-DD
 * @returns Date object no timezone local
 */
export const parseLocalDate = (isoDateString: string): Date => {
  const [year, month, day] = isoDateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed in JavaScript
};

/**
 * Formata string de data (YYYY-MM-DD) para formato brasileiro sem conversão de timezone
 * @param dateString - String no formato YYYY-MM-DD
 * @param options - Opções de formatação Intl.DateTimeFormat
 * @returns String formatada
 */
export const formatLocalDate = (
  dateString: string,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
): string => {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString('pt-BR', options);
};

/**
 * Converte Date para string ISO (YYYY-MM-DD) sem conversão de timezone
 * @param date - Date object
 * @returns String no formato YYYY-MM-DD
 */
export const toISODateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
