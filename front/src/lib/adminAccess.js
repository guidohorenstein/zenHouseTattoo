export const ADMIN_EMAILS = [
  "guidohorenstein03@gmail.com",
  "daginstruments@gmail.com",
];

export function isAllowedAdminEmail(email) {
  return ADMIN_EMAILS.includes(email?.trim().toLowerCase());
}
