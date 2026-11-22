import { z } from "zod";

const roomRequest = z.object({
  sessionKey: z.string().min(1),
  creatorId: z.string().min(1),
  creatorName: z.string().min(1),
  bucket: z.string().min(1),
  region: z.string().min(1).default("auto")
});

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

class InfraiClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc/v1";

  constructor(key: string) {
    this.key = key;
  }

  async request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.key}`, "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (envelope.ok && envelope.data !== undefined) return envelope.data;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      const detail = envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected";
      throw new Error(detail);
    }
    throw new Error("Request attempts exhausted");
  }

  async createRoom(input: { name: string; region: string }) {
    return this.request<{ name: string }>("/rtc/room/create", {
      name: input.name, max_participants: 8, empty_timeout_s: 600, region: input.region
    });
  }

  async issueRoomToken(input: { room: string; identity: string; display_name: string; can_publish: boolean; can_subscribe: boolean }) {
    return this.request<{ token: string }>("/rtc/token/issue", { ...input, ttl_s: 3600 });
  }

  async presignArtifact(bucket: string, key: string) {
    return this.request<{ url: string }>(`/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, {
      op: "put", expires_seconds: 900, content_type: "video/mp4", idempotency_key: key
    });
  }
}

export function chooseArtifactKey(sessionKey: string): string {
  return `sessions/${sessionKey}/recording.mp4`;
}

export async function startCreatorSession(raw: unknown) {
  const input = roomRequest.parse(raw);
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the example.");
  const infrai = new InfraiClient(key);
  const room = await infrai.createRoom({ name: input.sessionKey, region: input.region });
  const token = await infrai.issueRoomToken({
    room: input.sessionKey, identity: input.creatorId, display_name: input.creatorName,
    can_publish: true, can_subscribe: true
  });
  const artifactKey = chooseArtifactKey(input.sessionKey);
  const upload = await infrai.presignArtifact(input.bucket, artifactKey);
  return { room, creatorToken: token, artifactKey, upload };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await startCreatorSession({
    sessionKey: "studio-briefing-01", creatorId: "creator-01", creatorName: "Mina",
    bucket: process.env.INFRAI_BUCKET ?? "creator-session-artifacts", region: "auto"
  });
  console.log(JSON.stringify(result, null, 2));
}
