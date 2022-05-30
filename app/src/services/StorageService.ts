import { encrypt, decrypt } from '@utils/encryption';
const windowWithPoint = window as unknown as WindowWithPoint;

type StoredStringId = string;

export async function putString(data: string): Promise<StoredStringId> {
  const { data: storedStringId } = await windowWithPoint.point.storage.putString({
    data,
  });

  return storedStringId;
}

export async function getString(storedStringId: StoredStringId): Promise<string> {
  const { data: storedString } = await windowWithPoint.point.storage.getString({
    id: storedStringId,
  });

  return storedString;
}

export async function putFile(file: File) {
  const response = await windowWithPoint.point.storage.putFile(file);
  return response;
}

export async function postFile(file: any) {
  const response = await windowWithPoint.point.storage.postFile(file);
  return response;
}

function processChunk(chunk: Blob, _encryptionKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const readEventHandler = async (event: any) => {
      const {
        target: { error, result },
      } = event;
      if (error) {
        reject(error);
      }
      const data = new Uint8Array(result);
      const encrypted = await encrypt(_encryptionKey, data);

      const formData = new FormData();
      formData.append('postfile', new File([encrypted], `chunk-${chunk}`));
      const { data: id } = await postFile(formData);

      resolve(id);
    };

    const reader = new FileReader();
    reader.onload = readEventHandler;
    reader.readAsArrayBuffer(chunk);
  });
}

const CHUNK_SIZE = 1024 * 1024 * 5; // 5mb
export async function encryptAndStoreFile(
  _file: File,
  _encryptionKey: string
): Promise<StoredFile> {
  const file: StoredFile = {
    name: _file.name,
    size: _file.size,
    type: _file.type,
    lastModified: _file.lastModified,
    chunks: [],
  };

  // encrypt and save chunks
  const chunksQty = Math.ceil(file.size / CHUNK_SIZE);

  console.log('chunks', chunksQty);

  let currentChunk;
  let chunkStart;
  let chunkEnd;
  for (let chunkNumber = 0; chunkNumber < chunksQty; chunkNumber++) {
    console.log(file.name, 'processing chunk', chunkNumber);
    chunkStart = chunkNumber * CHUNK_SIZE;
    chunkEnd = Math.min(chunkStart + CHUNK_SIZE, file.size);
    currentChunk = _file.slice(chunkStart, chunkEnd);
    const chunkFileId = await processChunk(currentChunk, _encryptionKey);
    file.chunks.push({
      id: chunkFileId,
      position: chunkNumber,
    });
  }

  console.log(file);

  return file;
}

export async function getAndDecryptFile(
  _storedFile: StoredFile,
  _encryptionKey: string
): Promise<File> {
  let decryptedChunks: any[] = [];
  for (let chunk of _storedFile.chunks.sort((ch1, ch2) => ch1.position - ch2.position)) {
    const blob = await fetch(`/_storage/${chunk.id}`);
    decryptedChunks.push(await decrypt(_encryptionKey, await blob.text()));
  }
  const file = new File(decryptedChunks, _storedFile.name, {
    type: _storedFile.type,
    lastModified: _storedFile.lastModified,
  });
  return file;
}
