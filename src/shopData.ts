export type ItemId =
  | 'bow'
  | 'earring'
  | 'hat'
  | 'follower'
  | 'necklace'
  | 'dress'
  | 'bracelet'
  | 'sunglasses'
  | 'cape'
  | 'tshirt'
  | 'gloves'
  | 'globe';

export interface ShopItem {
  id: ItemId;
  name: string;
  price: number; // in kroner
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'bow', name: 'Bow', price: 10 },
  { id: 'earring', name: 'Earring', price: 15 },
  { id: 'hat', name: 'Hat', price: 20 },
  { id: 'follower', name: 'Chick that follows you', price: 50 },
  { id: 'bracelet', name: 'Bracelet', price: 10 },
  { id: 'necklace', name: 'Necklace', price: 12 },
  { id: 'tshirt', name: 'White T-shirt', price: 14 },
  { id: 'sunglasses', name: 'Sunglasses', price: 16 },
  { id: 'gloves', name: 'Boxing gloves', price: 18 },
  { id: 'cape', name: 'Cape', price: 20 },
  { id: 'dress', name: 'Dress', price: 22 },
  { id: 'globe', name: 'Globe for a head', price: 25 },
];

// What is kept between games (and between visits): the money and the wardrobe.
export interface SaveData {
  coins: number;
  owned: ItemId[];
  wearing: ItemId[];
}

const SAVE_KEY = 'easter-game-save';
const EMPTY_SAVE: SaveData = { coins: 0, owned: [], wearing: [] };

const isItemId = (value: unknown): value is ItemId =>
  SHOP_ITEMS.some(item => item.id === value);

export const loadSave = (): SaveData => {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');
    if (raw && typeof raw === 'object') {
      const owned = Array.isArray(raw.owned) ? raw.owned.filter(isItemId) : [];
      const wearing = Array.isArray(raw.wearing)
        ? raw.wearing.filter((id: unknown) => isItemId(id) && owned.includes(id))
        : [];
      const coins = Number.isFinite(raw.coins) && raw.coins > 0 ? Math.floor(raw.coins) : 0;
      return { coins, owned, wearing };
    }
  } catch {
    // Storage unavailable or corrupt: start with an empty save.
  }
  return EMPTY_SAVE;
};

export const storeSave = (save: SaveData) => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage unavailable: the save simply lasts until the page is closed.
  }
};
