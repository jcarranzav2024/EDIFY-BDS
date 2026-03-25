/**
 * Módulo de búsqueda fuzzy (tolerante a errores)
 * Permite encontrar coincidencias incluso si hay errores de escritura
 */

/**
 * Calcula la similitud entre dos strings usando Levenshtein Distance
 * @param {string} str1 - Primer string
 * @param {string} str2 - Segundo string
 * @returns {number} - Similitud de 0 a 1 (1 = idéntico)
 */
export function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;

  str1 = String(str1).toLowerCase().trim();
  str2 = String(str2).toLowerCase().trim();

  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  // Si uno contiene al otro, es una buena coincidencia
  if (str1.includes(str2) || str2.includes(str1)) {
    const minLen = Math.min(str1.length, str2.length);
    const maxLen = Math.max(str1.length, str2.length);
    return minLen / maxLen;
  }

  // Levenshtein Distance
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[str2.length][str1.length];
  const maxLength = Math.max(str1.length, str2.length);
  const similarity = 1 - distance / maxLength;

  return Math.max(0, similarity);
}

/**
 * Busca coincidencias fuzzy en un array de objetos
 * @param {Array} items - Array de items a buscar
 * @param {string} query - Término de búsqueda
 * @param {Array} fieldsToSearch - Campos del objeto a buscar
 * @param {number} threshold - Umbral mínimo de similitud (0-1)
 * @returns {Array} - Items ordenados por relevancia
 */
export function fuzzySearch(items, query, fieldsToSearch = [], threshold = 0.4) {
  if (!query || !items || items.length === 0) {
    return items;
  }

  const results = items
    .map((item) => {
      let maxSimilarity = 0;
      let matchedField = "";

      // Buscar la similitud más alta en los campos especificados
      fieldsToSearch.forEach((field) => {
        const value = item[field];
        if (value) {
          const similarity = calculateSimilarity(query, String(value));
          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            matchedField = field;
          }
        }
      });

      return {
        item,
        similarity: maxSimilarity,
        matchedField
      };
    })
    .filter((result) => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .map((result) => result.item);

  return results;
}

/**
 * Busca contratistas con múltiples criterios fuzzy
 * @param {Array} contractors - Array de contratistas
 * @param {Object} filters - Objeto con criterios de búsqueda
 * @returns {Array} - Contratistas filtrados y ordenados por relevancia
 */
export function searchContractors(contractors, filters = {}) {
  if (!contractors || contractors.length === 0) {
    return [];
  }

  let results = contractors;

  // Búsqueda por especialidad
  if (filters.especialidad && filters.especialidad.trim()) {
    results = fuzzySearch(results, filters.especialidad.trim(), ["especialidad", "servicios"], 0.4);
  }

  // Búsqueda por zona
  if (filters.zona && filters.zona.trim()) {
    results = fuzzySearch(results, filters.zona.trim(), ["zona"], 0.5);
  }

  // Búsqueda por nombre
  if (filters.nombre && filters.nombre.trim()) {
    results = fuzzySearch(results, filters.nombre.trim(), ["nombreVisible"], 0.4);
  }

  return results;
}
