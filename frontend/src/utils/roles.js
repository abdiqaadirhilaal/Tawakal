// Waa in ay la mid ahaataa backend/config/constants.js. Fiiro: tani waxay kaliya go'aamisaa
// waxa la muujiyo; awoodda dhabta ah waxaa lagu hubiyaa server-ka codsi kasta.
export const BACK_OFFICE_ROLES = ['admin', 'manager', 'staff'];
export const POS_ROLES = ['admin', 'manager', 'cashier'];
export const SUPERVISOR_ROLES = ['admin', 'manager'];
export const ADMIN_ONLY = ['admin'];

export const hasRole = (user, roles) => Boolean(user && roles.includes(user.role));
export const homeFor = (user) => (hasRole(user, BACK_OFFICE_ROLES) ? '/admin' : '/admin/pos');
