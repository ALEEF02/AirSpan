import assert from "node:assert/strict";
import test from "node:test";

import {
  findCaptureSource,
  getCaptureSourceType,
  serializeCaptureSource,
} from "./capture-sources.mjs";

test("classifies displays and windows from Electron source IDs", () => {
  assert.equal(
    getCaptureSourceType("screen:0:0"),
    "screen",
  );
  assert.equal(
    getCaptureSourceType("window:4312:0"),
    "window",
  );
});

test("serializes a capture source for the renderer", () => {
  const source = serializeCaptureSource({
    id: "screen:1:0",
    name: "Screen 2",
    display_id: "2528732444",
    thumbnail: {
      isEmpty: () => false,
      toDataURL: () => "data:image/png;base64,preview",
    },
  });

  assert.deepEqual(source, {
    id: "screen:1:0",
    name: "Screen 2",
    type: "screen",
    thumbnail: "data:image/png;base64,preview",
    displayId: "2528732444",
  });
});

test("finds only the explicitly selected capture source", () => {
  const sources = [
    { id: "screen:0:0" },
    { id: "window:4312:0" },
  ];

  assert.equal(
    findCaptureSource(
      sources,
      "window:4312:0",
    ),
    sources[1],
  );
  assert.equal(
    findCaptureSource(
      sources,
      "window:missing:0",
    ),
    null,
  );
  assert.equal(
    findCaptureSource(sources, ""),
    null,
  );
});
