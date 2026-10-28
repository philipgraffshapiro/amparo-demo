const maxBytes = 5 * 1024 * 1024;

async function readHeader(file, window) {
  const blob = file.slice(0, 12);
  if (blob.arrayBuffer) return new Uint8Array(await blob.arrayBuffer());
  return new Promise((resolve, reject) => {
    const reader = new window.FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.readAsArrayBuffer(blob);
  });
}

function signatureMatches(type, bytes) {
  if (type === 'image/png')
    return [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  if (type === 'image/jpeg')
    return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return (
    type === 'image/webp' &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  );
}

export class PrivateReportMedia {
  constructor(window) {
    this.window = window;
    this.draft = [];
    this.saved = new Map();
    this.generation = 0;
  }

  async add(files) {
    const selected = Array.from(files);
    if (selected.length + this.draft.length > 3)
      throw new Error('Choose up to three photos.');
    const generation = this.generation;
    for (const file of selected) {
      if (!file.size || file.size > maxBytes)
        throw new Error('Each photo must be under 5 MB.');
      if (!signatureMatches(file.type, await readHeader(file, this.window)))
        throw new Error('Choose a valid JPG, PNG or WebP image.');
    }
    if (generation !== this.generation) return;
    if (!this.window.URL.createObjectURL)
      throw new Error('Image previews are unavailable in this browser.');
    const added = [];
    try {
      for (const file of selected)
        added.push({
          name: file.name,
          size: file.size,
          type: file.type,
          file,
          url: this.window.URL.createObjectURL(file),
        });
      this.draft.push(...added);
    } catch (error) {
      for (const photo of added) this.window.URL.revokeObjectURL(photo.url);
      throw error;
    }
  }

  remove(index) {
    const [photo] = this.draft.splice(index, 1);
    if (photo) this.window.URL.revokeObjectURL(photo.url);
  }

  commit(reportId) {
    for (const photo of this.saved.get(reportId) ?? [])
      this.window.URL.revokeObjectURL(photo.url);
    this.saved.set(reportId, this.draft);
    this.draft = [];
  }

  forReport(reportId) {
    return this.saved.get(reportId) ?? [];
  }

  reset() {
    this.generation++;
    for (const photo of [...this.draft, ...[...this.saved.values()].flat()])
      this.window.URL.revokeObjectURL(photo.url);
    this.draft = [];
    this.saved.clear();
  }
}
