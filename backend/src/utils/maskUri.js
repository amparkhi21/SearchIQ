/** Hides credentials in connection strings before they are logged. */
export function maskUri(uri) {
  return String(uri).replace(/\/\/([^:@/]+):([^@]+)@/, '//$1:***@');
}
