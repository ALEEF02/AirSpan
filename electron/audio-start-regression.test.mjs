import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  airPlayPtpNanoseconds,
  buildAirPlayAudioSyncPacket,
} from "./airplay-audio-sync.mjs";

const mainSource = readFileSync(
  new URL("./main.mjs", import.meta.url),
  "utf8",
);

test("imports the PTP timestamp converter used by the timing transport", () => {
  assert.match(
    mainSource,
    /import\s*\{[^}]*airPlayPtpNanoseconds[^}]*\}\s*from\s*["']\.\/airplay-audio-sync\.mjs["']/,
  );
  assert.equal(
    airPlayPtpNanoseconds(1000n << 32n),
    1000000000000n,
  );
});

test("does not anchor audio before the first captured packet", () => {
  assert.equal(mainSource.includes("preAudioSyncTimer"), false);
  assert.match(mainSource, /source:\s*"first-audio-packet"/);
});

test("marks both initial and resumed audio packet boundaries", () => {
  assert.match(
    mainSource,
    /audio\.packetsSent === 0 \|\| resumedAfterPause[\s\S]*?\? 0xe0[\s\S]*?: 0x60/,
  );
});

test("encodes the negotiated PTP realtime latency window", () => {
  const timelineID = 0x0102030405060708n;
  const { packet } = buildAirPlayAudioSyncPacket({
    timingProtocol: "PTP",
    timelineID,
    timestamp: 1000n << 32n,
    rtpTimestamp: 100000,
    latencyMinSamples: 11025,
    latencyMaxSamples: 88200,
    startBoundary: true,
  });

  assert.equal(packet.length, 28);
  assert.equal(packet[0], 0x90);
  assert.equal(packet[1], 0xd7);
  assert.equal(packet.readUInt16BE(2), 6);
  assert.equal(packet.readUInt32BE(4), 100000);
  assert.equal(packet.readBigUInt64BE(8), 1000000000000n);
  assert.equal(packet.readUInt32BE(16), 177175);
  assert.equal(packet.readBigUInt64BE(20), timelineID);
});

test("maps the NTP wall time to the current playout position", () => {
  const { packet } = buildAirPlayAudioSyncPacket({
    timingProtocol: "NTP",
    timelineID: 0n,
    timestamp: 0x0123456789abcdefn,
    rtpTimestamp: 100000,
    latencyMinSamples: 11025,
    latencyMaxSamples: 88200,
    hasSentSync: true,
  });

  assert.equal(packet.length, 20);
  assert.equal(packet[0], 0x80);
  assert.equal(packet[1], 0xd4);
  assert.equal(packet.readUInt16BE(2), 7);
  assert.equal(packet.readUInt32BE(4), 88975);
  assert.equal(packet.readBigUInt64BE(8), 0x0123456789abcdefn);
  assert.equal(packet.readUInt32BE(16), 100000);
});

test("marks initial and resumed audio time-announcement boundaries", () => {
  assert.match(
    mainSource,
    /startBoundary,[\s\S]*?hasSentSync:\s*Boolean\(audio\.syncPackets\)/,
  );
});
