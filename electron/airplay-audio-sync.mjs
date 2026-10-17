export function airPlayPtpNanoseconds(timestamp) {
  const value = BigInt(timestamp || 0);
  const seconds = value >> 32n;
  const fraction = value & 0xffffffffn;

  return (
    seconds * 1000000000n +
    ((fraction * 1000000000n) >> 32n)
  );
}

export function advanceAirPlayRtpTimestampForGap({
  rtpTimestamp,
  gapMs,
  sampleRate,
  samplesPerFrame,
}) {
  const timestamp = Number(rtpTimestamp) >>> 0;
  const rate = Math.max(1, Number(sampleRate) || 0);
  const frameSamples = Math.max(
    1,
    Number(samplesPerFrame) || 0,
  );
  const elapsedSamples = Math.max(
    frameSamples,
    Math.round(
      Math.max(0, Number(gapMs) || 0) *
        rate /
        1000,
    ),
  );
  // rtpTimestamp already points one frame beyond the last packet. Advance it
  // only by the additional samples that elapsed while no packets were sent.
  const skippedSamples = Math.max(
    0,
    elapsedSamples - frameSamples,
  );

  return {
    rtpTimestamp:
      (timestamp + skippedSamples) >>> 0,
    elapsedSamples,
    skippedSamples,
  };
}

export function buildAirPlayAudioSyncPacket({
  timingProtocol,
  timelineID,
  timestamp,
  rtpTimestamp,
  latencyMinSamples,
  latencyMaxSamples,
  startBoundary = false,
  hasSentSync = false,
}) {
  const useNtpAudio = timingProtocol === "NTP";
  const normalizedTimelineID = useNtpAudio
    ? 0n
    : BigInt(timelineID || 0);
  const hasPtpTimeline = normalizedTimelineID !== 0n;
  const packetRtpTimestamp = Number(rtpTimestamp) >>> 0;
  const minimumLatencySamples = Number(latencyMinSamples) >>> 0;
  const maximumLatencySamples = Math.max(
    minimumLatencySamples,
    Number(latencyMaxSamples) >>> 0,
  );
  const streamLatencySamples = hasPtpTimeline
    ? maximumLatencySamples - minimumLatencySamples
    : minimumLatencySamples;
  const firstRtpTimestamp = hasPtpTimeline
    ? packetRtpTimestamp
    : (packetRtpTimestamp - minimumLatencySamples) >>> 0;
  const secondRtpTimestamp = hasPtpTimeline
    ? (packetRtpTimestamp + streamLatencySamples) >>> 0
    : packetRtpTimestamp;
  const packet = Buffer.alloc(hasPtpTimeline ? 28 : 20);

  packet[0] = startBoundary || !hasSentSync ? 0x90 : 0x80;
  packet[1] = hasPtpTimeline ? 0xd7 : 0xd4;
  packet.writeUInt16BE(hasPtpTimeline ? 6 : 7, 2);

  // A PTP receiver derives its realtime stream latency from the second RTP
  // position minus the first. With our advertised 11025..88200 frame window,
  // that must be +77175 frames. AirPlay's legacy NTP packet has different
  // semantics: it maps the current playout position to the wall clock, then
  // carries the packet head in its final word.
  packet.writeUInt32BE(firstRtpTimestamp, 4);

  if (hasPtpTimeline) {
    packet.writeBigUInt64BE(
      airPlayPtpNanoseconds(timestamp),
      8,
    );
    packet.writeUInt32BE(secondRtpTimestamp, 16);
    packet.writeBigUInt64BE(normalizedTimelineID, 20);
  } else {
    packet.writeBigUInt64BE(BigInt(timestamp || 0), 8);
    packet.writeUInt32BE(secondRtpTimestamp, 16);
  }

  return {
    packet,
    packetRtpTimestamp,
    firstRtpTimestamp,
    secondRtpTimestamp,
    streamLatencySamples,
    hasPtpTimeline,
  };
}
