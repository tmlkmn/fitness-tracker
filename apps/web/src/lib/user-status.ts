export type UserStatus =
  | "Admin"
  | "Aktif"
  | "Bekliyor"
  | "Süresi Dolmuş"
  | "Üyelik Dolmuş"
  | "Dondurulmuş";

export interface UserStatusInput {
  role: string | null;
  frozenAt: Date | null;
  isApproved: boolean;
  mustChangePassword: boolean | null;
  membershipEndDate: Date | null;
  inviteExpiresAt: Date | null;
}

export function getUserStatus(user: UserStatusInput): UserStatus {
  if (user.role === "admin") return "Admin";
  if (user.frozenAt !== null) return "Dondurulmuş";
  if (user.isApproved && !user.mustChangePassword) {
    if (
      user.membershipEndDate &&
      new Date(user.membershipEndDate) <= new Date()
    ) {
      return "Üyelik Dolmuş";
    }
    return "Aktif";
  }
  if (user.inviteExpiresAt && new Date(user.inviteExpiresAt) <= new Date()) {
    return "Süresi Dolmuş";
  }
  return "Bekliyor";
}
