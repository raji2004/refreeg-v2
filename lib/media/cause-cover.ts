export const CAUSE_COVER_WIDTH = 1600;
export const CAUSE_COVER_HEIGHT = 900;
export const CAUSE_COVER_ASPECT_RATIO = CAUSE_COVER_WIDTH / CAUSE_COVER_HEIGHT;
export const CAUSE_COVER_DESCRIPTION =
  "JPG, PNG, or WebP · any orientation · cropped to 1600 × 900 px";

const CAUSE_COVER_ASPECT_TOLERANCE = 0.02;

export const CAUSE_COVER_ACCEPT = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

const ALLOWED_CAUSE_COVER_TYPES = new Set(Object.keys(CAUSE_COVER_ACCEPT));

type ImageDimensions = {
  width: number;
  height: number;
};

type ImageFile = {
  type: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function readUint16BigEndian(bytes: Uint8Array, offset: number) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint16LittleEndian(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint24LittleEndian(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function readUint32BigEndian(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] * 2 ** 24 +
    bytes[offset + 1] * 2 ** 16 +
    bytes[offset + 2] * 2 ** 8 +
    bytes[offset + 3]
  );
}

function readUint32LittleEndian(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] +
    bytes[offset + 1] * 2 ** 8 +
    bytes[offset + 2] * 2 ** 16 +
    bytes[offset + 3] * 2 ** 24
  );
}

function hasAscii(bytes: Uint8Array, offset: number, value: string) {
  return [...value].every(
    (character, index) => bytes[offset + index] === character.charCodeAt(0),
  );
}

function readPngDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (
    bytes.length < 24 ||
    bytes[0] !== 0x89 ||
    !hasAscii(bytes, 1, "PNG") ||
    bytes[4] !== 0x0d ||
    bytes[5] !== 0x0a ||
    bytes[6] !== 0x1a ||
    bytes[7] !== 0x0a
  ) {
    return null;
  }

  return {
    width: readUint32BigEndian(bytes, 16),
    height: readUint32BigEndian(bytes, 20),
  };
}

function readJpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
    0xcf,
  ]);
  let offset = 2;

  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 1 >= bytes.length) return null;

    const segmentLength = readUint16BigEndian(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;

    if (startOfFrameMarkers.has(marker)) {
      return {
        height: readUint16BigEndian(bytes, offset + 3),
        width: readUint16BigEndian(bytes, offset + 5),
      };
    }

    offset += segmentLength;
  }

  return null;
}

function readWebpDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (
    bytes.length < 30 ||
    !hasAscii(bytes, 0, "RIFF") ||
    !hasAscii(bytes, 8, "WEBP")
  ) {
    return null;
  }

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkType = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3],
    );
    const chunkSize = readUint32LittleEndian(bytes, offset + 4);
    const payload = offset + 8;

    if (chunkType === "VP8X" && payload + 10 <= bytes.length) {
      return {
        width: readUint24LittleEndian(bytes, payload + 4) + 1,
        height: readUint24LittleEndian(bytes, payload + 7) + 1,
      };
    }

    if (
      chunkType === "VP8 " &&
      payload + 10 <= bytes.length &&
      bytes[payload + 3] === 0x9d &&
      bytes[payload + 4] === 0x01 &&
      bytes[payload + 5] === 0x2a
    ) {
      return {
        width: readUint16LittleEndian(bytes, payload + 6) & 0x3fff,
        height: readUint16LittleEndian(bytes, payload + 8) & 0x3fff,
      };
    }

    if (
      chunkType === "VP8L" &&
      payload + 5 <= bytes.length &&
      bytes[payload] === 0x2f
    ) {
      const byte1 = bytes[payload + 1];
      const byte2 = bytes[payload + 2];
      const byte3 = bytes[payload + 3];
      const byte4 = bytes[payload + 4];
      return {
        width: 1 + (((byte2 & 0x3f) << 8) | byte1),
        height: 1 + (((byte4 & 0x0f) << 10) | (byte3 << 2) | ((byte2 & 0xc0) >> 6)),
      };
    }

    offset = payload + chunkSize + (chunkSize % 2);
  }

  return null;
}

export function readImageDimensions(bytes: Uint8Array): ImageDimensions | null {
  return (
    readPngDimensions(bytes) ||
    readJpegDimensions(bytes) ||
    readWebpDimensions(bytes)
  );
}

async function validateCauseImage(
  file: ImageFile,
  label: "Cover image" | "Gallery image",
  requireLandscape: boolean,
): Promise<string | null> {
  if (!ALLOWED_CAUSE_COVER_TYPES.has(file.type)) {
    return `${label} must be a JPG, PNG, or WebP file.`;
  }

  const dimensions = readImageDimensions(new Uint8Array(await file.arrayBuffer()));
  if (!dimensions) {
    return `Could not read the ${label.toLowerCase()}. Choose a valid JPG, PNG, or WebP file.`;
  }

  if (
    requireLandscape &&
    Math.abs(dimensions.width / dimensions.height - CAUSE_COVER_ASPECT_RATIO) >
      CAUSE_COVER_ASPECT_TOLERANCE
  ) {
    return `${label} must be cropped to 16:9 so it fills the campaign frame. Selected image is ${dimensions.width} × ${dimensions.height} px.`;
  }

  return null;
}

export function validateCauseCoverImage(file: ImageFile) {
  return validateCauseImage(file, "Cover image", true);
}

export function validateCauseGalleryImage(file: ImageFile) {
  return validateCauseImage(file, "Gallery image", false);
}
