// Resolve navigation against the configured storefront, never the domain root.
export function storeUrl(target = '') {
  return new URL(target, new URL(import.meta.env.BASE_URL, location.origin)).href;
}
