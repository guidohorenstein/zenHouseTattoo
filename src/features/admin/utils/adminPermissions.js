export function getAdminPermissions(profile) {
  const role = profile?.role || (profile?.is_super_admin ? "owner" : "viewer");
  const isOwner = profile?.is_super_admin || role === "owner";
  const isAdmin = role === "admin";
  const canEditContent = isOwner || isAdmin;

  return {
    canEditBodyPhotos: canEditContent,
    canEditRequests: canEditContent,
    canEditStyles: canEditContent,
    canManageUsers: isOwner,
    canViewAdmin: Boolean(profile?.is_active),
    role,
  };
}
