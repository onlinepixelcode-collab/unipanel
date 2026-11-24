/** Prefix a public/ path with the deployment basePath (served under /unipanel). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/unipanel";
export const asset = (p: string) => `${BASE_PATH}${p.startsWith("/") ? p : `/${p}`}`;
export const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "1";
