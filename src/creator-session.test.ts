import assert from "node:assert/strict";
import { chooseArtifactKey } from "./creator-session.ts";

const input = "studio-briefing-01";
const expected = "sessions/studio-briefing-01/recording.mp4";
assert.equal(chooseArtifactKey(input), expected);
console.log("creator session artifact decision passed");
