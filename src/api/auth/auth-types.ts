export interface GoogleAuthResponse {
  isNewUser: boolean;
  userId: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}