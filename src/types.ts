export type User = {
  id: string;
  username: string;
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
