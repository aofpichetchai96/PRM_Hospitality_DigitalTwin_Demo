// URL of a file under public/. The GitHub Pages build serves the app from
// /<repo>/, so plain <img src> paths need that prefix; locally it's empty.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const asset = (path: `/${string}`) => `${BASE}${path}`;
