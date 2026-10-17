export function getCaptureSourceType(sourceId) {
  return String(sourceId).startsWith("screen:")
    ? "screen"
    : "window";
}

export function serializeCaptureSource(source) {
  let thumbnail = "";

  try {
    if (
      source.thumbnail &&
      !source.thumbnail.isEmpty()
    ) {
      thumbnail = source.thumbnail.toDataURL();
    }
  } catch {
    // A source is still selectable when Windows cannot provide its preview.
  }

  return {
    id: source.id,
    name:
      String(source.name || "").trim() ||
      (getCaptureSourceType(source.id) === "screen"
        ? "Display"
        : "Untitled window"),
    type: getCaptureSourceType(source.id),
    thumbnail,
    displayId: source.display_id || null,
  };
}

export function findCaptureSource(sources, sourceId) {
  if (
    typeof sourceId !== "string" ||
    !sourceId
  ) {
    return null;
  }

  return (
    sources.find(
      (source) => source.id === sourceId,
    ) || null
  );
}
