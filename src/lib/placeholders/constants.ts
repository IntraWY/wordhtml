/** Matches {{variableName}} merge fields (Thai + Latin identifiers). */
export const MERGE_FIELD_REGEX = /\{\{([A-Za-z_฀-๿][\w฀-๿_]*)\}\}/g;

export const MERGE_FIELD_REGEX_SOURCE = MERGE_FIELD_REGEX.source;

/**
 * Supported merge-field filters:
 * {{name|baht}}, {{name|currency}}, {{name|percent}}, {{name|comma}},
 * {{name|thai}}, {{name|date}}, {{name|upper}}, {{name|lower}}.
 */
export const MERGE_FIELD_FILTERS = [
  "baht",
  "currency",
  "percent",
  "comma",
  "thai",
  "date",
  "upper",
  "lower",
] as const;

export type MergeFieldFilter = (typeof MERGE_FIELD_FILTERS)[number];

/** Filters that require a numeric input value (Arabic or Thai numerals). */
export const NUMERIC_MERGE_FIELD_FILTERS = [
  "baht",
  "currency",
  "percent",
  "comma",
] as const satisfies readonly MergeFieldFilter[];

/** Thai display names (English in parens) for UI lists / documentation. */
export const MERGE_FIELD_FILTER_LABELS: Record<MergeFieldFilter, string> = {
  baht: "จำนวนเงินเป็นตัวอักษร (Baht text)",
  currency: "รูปแบบเงิน 1,234.56 (Currency)",
  percent: "เปอร์เซ็นต์ (Percent)",
  comma: "คั่นหลักพัน (Thousands comma)",
  thai: "เลขไทย (Thai digits)",
  date: "วันที่ไทย (Thai date)",
  upper: "ตัวพิมพ์ใหญ่ (Uppercase)",
  lower: "ตัวพิมพ์เล็ก (Lowercase)",
};

/** Matches {{variableName|filter}} merge fields. Group 1 = name, group 2 = filter. */
export const FILTERED_MERGE_FIELD_REGEX_SOURCE =
  "\\{\\{([A-Za-z_\\u0E00-\\u0E7F][\\w\\u0E00-\\u0E7F_]*)\\|(" +
  MERGE_FIELD_FILTERS.join("|") +
  ")\\}\\}";

/**
 * Matches {{name|anything}} regardless of filter validity — used by export
 * health to flag typo'd filters, which the resolve passes silently skip.
 */
export const ANY_FILTERED_MERGE_FIELD_REGEX_SOURCE =
  "\\{\\{([A-Za-z_\\u0E00-\\u0E7F][\\w\\u0E00-\\u0E7F_]*)\\|([\\w\\u0E00-\\u0E7F]+)\\}\\}";

/** Page/header/footer tokens: {page}, {total}, {page_th}, {total_th}, {date}, {date_th}, {date_th_short}, {date_en}, {time}, {time_th} */
export const PAGE_TOKEN_REGEX =
  /\{(page_th|total_th|page|total|date_th_short|date_th|date_en|date|time_th|time)\}/g;

/**
 * Broad brace-token matcher used by `replacePageTokens` so that unknown
 * tokens like `{xyz}` are detected and kept literally in the output
 * (instead of silently becoming ""). Known tokens are resolved via the
 * values map; anything else passes through unchanged.
 */
export const ANY_BRACE_TOKEN_REGEX = /\{([A-Za-z_][\w]*)\}/g;
