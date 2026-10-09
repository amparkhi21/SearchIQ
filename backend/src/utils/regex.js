/** Escapes user input so it can be safely placed inside a RegExp. */
export const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
