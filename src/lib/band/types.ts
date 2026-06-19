export interface BandMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string | null;
  senderType: "User" | "Agent";
  messageType: string;
  chatRoomId: string;
  insertedAt: string | null;
  metadata: Record<string, unknown> | null;
}

export interface BandRoom {
  id: string;
  name: string | null;
  taskId: string | null;
  insertedAt: string | null;
  updatedAt: string | null;
}

export interface BandParticipant {
  id: string;
  name: string | null;
  type: "User" | "Agent";
  role: "owner" | "admin" | "member";
}
