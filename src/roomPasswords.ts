const STORAGE_KEY = 'room_passwords_v1';

type RoomPasswordMap = Record<string, string>;

function readMap(): RoomPasswordMap {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as RoomPasswordMap;
    return {};
  } catch {
    return {};
  }
}

function writeMap(map: RoomPasswordMap): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota or serialization errors
  }
}

export function getRoomPassword(roomId: string): string | undefined {
  const map = readMap();
  return map[roomId];
}

export function setRoomPassword(roomId: string, password: string): void {
  const map = readMap();
  map[roomId] = password;
  writeMap(map);
}

export function clearRoomPasswords(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
