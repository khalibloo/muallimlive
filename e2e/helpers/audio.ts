// Recitation media host (NEXT_PUBLIC_API_MEDIA_URI in .env.test); the testPage fixture mocks it
export const MEDIA_URI = process.env.NEXT_PUBLIC_API_MEDIA_URI || "https://audio.qurancdn.com";

/** Builds a recitation file URL the same way the chapter page does */
export const mediaUrl = (path: string) => {
  const url = new URL(MEDIA_URI);
  url.pathname = path;
  return url.href;
};

/** A valid 8 kHz, 8-bit mono PCM WAV file of silence */
export const silentWav = (seconds: number) => {
  const sampleRate = 8000;
  const dataSize = Math.round(sampleRate * seconds);
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate, 28); // byte rate
  buffer.writeUInt16LE(1, 32); // block align
  buffer.writeUInt16LE(8, 34); // bits per sample
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);
  // 8-bit PCM is unsigned, so 128 is the zero line
  buffer.fill(128, 44);
  return buffer;
};
