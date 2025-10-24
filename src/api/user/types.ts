export interface userResponse {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl?: string | null;
  createdAt: Date | null;
}