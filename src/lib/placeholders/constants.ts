/** Matches {{variableName}} merge fields (Thai + Latin identifiers). */
export const MERGE_FIELD_REGEX = /\{\{([A-Za-z_\u0E00-\u0E7F][\w\u0E00-\u0E7F_]*)\}\}/g;

export const MERGE_FIELD_REGEX_SOURCE = MERGE_FIELD_REGEX.source;

/** Supported merge-field filters: {{name|baht}}, {{name|thai}}, {{name|date}}. */
export const MERGE_FIELD_FILTERS = ["baht", "thai", "date"] as const;

/** Matches {{variableName|filter}} merge fields. Group 1 = name, group 2 = filter. */
export const FILTERED_MERGE_FIELD_REGEX_SOURCE =
  "\\{\\{([A-Za-z_\\u0E00-\\u0E7F][\\w\\u0E00-\\u0E7F_]*)\\|(baht|thai|date)\\}\\}";

/** Page/header/footer tokens: {page}, {total}, {date}, {date_th}, {date_th_short}, {date_en} */
export const PAGE_TOKEN_REGEX =
  /\{(page|total|date_th_short|date_th|date_en|date)\}/g;
