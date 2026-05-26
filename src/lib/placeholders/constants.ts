/** Matches {{variableName}} merge fields (Thai + Latin identifiers). */
export const MERGE_FIELD_REGEX = /\{\{([A-Za-z_\u0E00-\u0E7F][\w\u0E00-\u0E7F_]*)\}\}/g;

export const MERGE_FIELD_REGEX_SOURCE = MERGE_FIELD_REGEX.source;

/** Page/header/footer tokens: {page}, {total}, {date} */
export const PAGE_TOKEN_REGEX = /\{(page|total|date)\}/g;
