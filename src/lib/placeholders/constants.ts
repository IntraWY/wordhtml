/** Matches {{variableName}} merge fields (Thai + Latin identifiers). */
export const MERGE_FIELD_REGEX = /\{\{([A-Za-z_\u0E00-\u0E7F][\w\u0E00-\u0E7F_]*)\}\}/g;

export const MERGE_FIELD_REGEX_SOURCE = MERGE_FIELD_REGEX.source;

/** Supported merge-field filters: {{name|baht}}, {{name|thai}}, {{name|date}}, {{name|comma}}. */
export const MERGE_FIELD_FILTERS = ["baht", "thai", "date", "comma"] as const;

/** Matches {{variableName|filter}} merge fields. Group 1 = name, group 2 = filter. */
export const FILTERED_MERGE_FIELD_REGEX_SOURCE =
  "\\{\\{([A-Za-z_\\u0E00-\\u0E7F][\\w\\u0E00-\\u0E7F_]*)\\|(baht|thai|date|comma)\\}\\}";

/**
 * Matches {{name|anything}} regardless of filter validity — used by export
 * health to flag typo'd filters, which the resolve passes silently skip.
 */
export const ANY_FILTERED_MERGE_FIELD_REGEX_SOURCE =
  "\\{\\{([A-Za-z_\\u0E00-\\u0E7F][\\w\\u0E00-\\u0E7F_]*)\\|([\\w\\u0E00-\\u0E7F]+)\\}\\}";

/** Page/header/footer tokens: {page}, {total}, {page_th}, {total_th}, {date}, {date_th}, {date_th_short}, {date_en} */
export const PAGE_TOKEN_REGEX =
  /\{(page_th|total_th|page|total|date_th_short|date_th|date_en|date)\}/g;
