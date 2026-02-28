/** Returns the URL only if it uses http(s) protocol. Prevents javascript: XSS. */
export function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return /^https?:\/\//i.test(url) ? url : undefined;
}
