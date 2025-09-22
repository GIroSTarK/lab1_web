export type User = {
  id: string;
  username: string;
  role?: 'user' | 'admin';
};

export type RoomSummary = {
  id: string;
  name: string;
  ownerId: string;
  protected: boolean;
  membersCount: number;
  messagesCount: number;
};

export type ChatMessage = {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
};
