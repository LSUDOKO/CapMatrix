import type { BandMessage, BandRoom, BandParticipant } from "./types";

const BAND_BASE = "https://app.band.ai";

function sendKey(): string {
  return process.env.BAND_SEND_API_KEY ?? "";
}

function apiKeyHeader(override?: string): Record<string, string> {
  return { "X-API-Key": override ?? sendKey(), "Content-Type": "application/json" };
}

async function bandFetch<T>(
  path: string,
  { method, body, params, key }: {
    method?: string;
    body?: unknown;
    params?: Record<string, string | undefined>;
    key?: string;
  } = {},
): Promise<T> {
  let url = `${BAND_BASE}/${path}`;
  if (params) {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined) s.set(k, v);
    const q = s.toString();
    if (q) url += `?${q}`;
  }
  const res = await fetch(url, {
    method: method ?? "GET",
    headers: apiKeyHeader(key),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Band API ${res.status}: ${text.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function listRooms(key?: string): Promise<BandRoom[]> {
  const d = await bandFetch<{ data: BandRoom[] }>("api/v1/agent/chats", { key });
  return d.data ?? [];
}

export async function getRoomMessages(
  roomId: string,
  { page = 1, pageSize = 50, key }: { page?: number; pageSize?: number; key?: string } = {},
): Promise<BandMessage[]> {
  const d = await bandFetch<{ data: BandMessage[] }>(
    `api/v1/agent/chats/${roomId}/messages`,
    { params: { page: String(page), page_size: String(pageSize) }, key },
  );
  return d.data ?? [];
}

export async function getRoomContext(
  roomId: string,
  { page = 1, pageSize = 50, key }: { page?: number; pageSize?: number; key?: string } = {},
): Promise<BandMessage[]> {
  const d = await bandFetch<{ data: BandMessage[] }>(
    `api/v1/agent/chats/${roomId}/context`,
    { params: { page: String(page), page_size: String(pageSize) }, key },
  );
  return d.data ?? [];
}

export async function sendMessage(
  roomId: string,
  content: string,
  mentionIds: string[],
  { key }: { key?: string } = {},
): Promise<BandMessage> {
  const apiKey = key ?? sendKey();
  const d = await bandFetch<{ data: BandMessage }>(
    `api/v1/agent/chats/${roomId}/messages`,
    {
      method: "POST",
      key: apiKey,
      body: {
        message: {
          content,
          mentions: mentionIds.map((id) => ({ id })),
        },
      },
    },
  );
  return d.data;
}

export async function createRoom(key?: string): Promise<string> {
  const d = await bandFetch<{ data: { id: string } }>(
    "api/v1/agent/chats",
    { method: "POST", body: {}, key },
  );
  return d.data.id;
}

export async function addRoomParticipant(
  roomId: string,
  participantId: string,
  role: "owner" | "admin" | "member" = "member",
  { key }: { key?: string } = {},
): Promise<void> {
  await bandFetch(
    `api/v1/agent/chats/${roomId}/participants`,
    {
      method: "POST",
      key,
      body: { participant_id: participantId, role },
    },
  );
}

export async function getParticipants(
  roomId: string,
  { key }: { key?: string } = {},
): Promise<BandParticipant[]> {
  const d = await bandFetch<{ data: BandParticipant[] }>(
    `api/v1/agent/chats/${roomId}/participants`,
    { key },
  );
  return d.data ?? [];
}
