// Wuxuu khaladaadka server-ka (errors: [{ field, message }]) ku dhejiyaa goobaha foomka.
// map: { 'customer.name': 'name' } = magaca goobta server-ka -> magaca goobta foomka.
// strict: true = kaliya goobaha ku jira map-ka ayaa la dejiyaa.
export function applyServerErrors(error, setError, map = {}, { strict = false } = {}) {
  let applied = 0;
  (error?.errors || []).forEach((e) => {
    if (!e.field) return;
    const name = map[e.field] || (strict ? null : e.field);
    if (!name) return;
    setError(name, { type: 'server', message: e.message });
    applied += 1;
  });
  return applied;
}
