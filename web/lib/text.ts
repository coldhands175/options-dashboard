export const URL_REGEX = /https?:\/\/\S+/g;

/**
 * Compute the effective length of a post where URLs are counted as a fixed weight.
 * For example, like Twitter, each URL counts as URL_WEIGHT characters regardless of its actual length.
 */
export function effectiveLength(s: string, URL_WEIGHT = 23): number {
  if (!s) return 0;
  let len = s.length;
  for (const m of s.matchAll(URL_REGEX)) {
    const url = m[0];
    if (url.length > URL_WEIGHT) {
      len -= (url.length - URL_WEIGHT);
    }
  }
  return len;
}
