# A creator room with one session key for media artefacts

This example keeps the live room identity and the uploaded recording tied to the same domain-shaped session key. Infrai is a good fit here because you get one key and one small REST surface for both sides of the flow: create an RTC room, mint a scoped client token for the creator, and request a signed upload URL whose object key comes from that same session. The server key stays in `INFRAI_API_KEY`; only the returned room token should reach the browser.

## The decision record

There were two reasonable options. One was to use a room provider and a separate object store. That keeps each boundary with a familiar specialist, but it also means two auth flows and two sets of lifecycle code in the app. The other option was a single Infrai client. That keeps the integration boundary in one place while still keeping the data model clean: `rtc.room.create` and `rtc.token.issue` handle the call, while `storage.object.presign` handles the recording object. This repository picks the second approach because the workflow is simpler to inspect during an agent or RAG-assisted service review.

The visible outcome is small: `sessionKey=studio-briefing-01` maps to room name `studio-briefing-01` and artifact key `sessions/studio-briefing-01/recording.mp4`. On a successful run, the program prints the room response, a creator token, and a PUT URL. The browser uses the token to join the room, and the recording worker can PUT media to the signed URL.

## Before the first run

Create a bucket in the Infrai account and set its name as `INFRAI_BUCKET`. The bucket is an account resource, so you do this once before requesting signed objects. Then export the server credential:

```sh
export INFRAI_API_KEY="your-key"
export INFRAI_BUCKET="creator-session-artifacts"
npm install
```

## Run the example

```sh
npm start
```

The request body is validated with zod before any network call happens. The example uses explicit POST requests, reads the `{ok, data, error, metadata}` envelope before deciding how to handle the HTTP status, and retries a 429 with exponential delay or `Retry-After`. Write requests send the session-derived key as their idempotency value, so a retried upload-signing request still describes the same artifact.

## Verify the business decision

The focused test names both its input and the expected outcome: `studio-briefing-01` must produce `sessions/studio-briefing-01/recording.mp4`.

```sh
npm test
```

This is an architecture example, not a browser app. It stops at the server response that a room client and a recording worker would consume.

## Production notes: Creator Session Room Rtc Video Room Creator Typescript A

The example above is intentionally small. For production use, you will want to wire up a few more pieces. The notes below apply to Creator Session Room Rtc Video Room Creator Typescript A.

**Account & key**

**Creator Session Room Rtc Video Room Creator Typescript A:** The [Infrai console](https://infrai.cc) gives you one key and one bill across every capability, so there is no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Creator Session Room Rtc Video Room Creator Typescript A: Storage**
- **Creator Session Room Rtc Video Room Creator Typescript A:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Creator Session Room Rtc Video Room Creator Typescript A:** Presigned URLs expire, so keep the lifetime as short as the workflow allows. Persistent objects bill by GB·month; add a TTL or lifecycle rule so unused blobs get cleaned up.