export interface WatchlistItem {
  tokenAddress: string;
  poolAddress?: string;
  migratedFrom?: string;
  createdAt: number;
  name: string;
  symbol: string;
  logoURI: string;
  marketCap?: number;
  liquidity?: number;
  hourlyVolume?: number;
  protocol: string;
  subProtocol: string;
  decimals: number;
  socials: {
    website?: string;
    twitter?: string;
    telegram?: string;
    tiktok?: string;
  };
  devAddress: string;
  migratedTo: string;
}

export interface WatchlistResponse extends Array<WatchlistItem> {}

// Preset types
export interface PresetConfigItem {
  tp_percent?: number;
  sl_percent?: number;
  sell_percent: number;
}

export interface Preset {
  id: string;
  userId: string;
  config: PresetConfigItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePresetRequest {
  config: PresetConfigItem[];
  name: string;
  description: string;
  emoji: string;
}

export interface UpdatePresetRequest {
  presetId: string;
  config: PresetConfigItem[];
  name: string;
  description: string;
  emoji: string;
}

export interface PresetResponse {
  id: string;
  name: string;
  description: string;
  emoji: string;
  config: PresetConfigItem[];
  createdAt: number;
  updatedAt: number;
}
