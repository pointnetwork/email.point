import React, { useState, useEffect } from 'react';

import { encrypt, decrypt, generateRandomBytes, getCryptoKeyFromRawKey } from '@utils/encryption';

const CHUNK_SIZE = 1024 * 1024 * 5;

const getRandomCryptoKey = async () => {
  const randomBytes = await generateRandomBytes(16);
  const randomKey = await getCryptoKeyFromRawKey(randomBytes);
  return randomKey;
};

const encryptedChunks: any[] = [];
let fileMetaData: any = {};

const FileUpload: React.FC<{}> = () => {
  const [cryptoKey, setCryptoKey] = useState<any>(null);
  const [url, setUrl] = useState<any>(null);
  useEffect(() => {
    getRandomCryptoKey()
      .then((key) => {
        console.log('key', key);
        setCryptoKey(key);
      })
      .catch((error) => {
        console.log('asdad');
        console.error(error);
      });
  }, []);

  const password = 'aaaaa';

  async function uploadChunk(chunk: number, encryptedData: string) {
    console.log('uploading chunk', chunk);
    const formData = new FormData();
    formData.append('postfile', new File([encryptedData], `chunk-${chunk}`));
    const { data: id } = await (window as any).point.storage.postFile(formData);
    const chunkMetadata = {
      id,
      chunk,
    };
    console.log(chunkMetadata);
    encryptedChunks.push(chunkMetadata);
  }

  function processChunk(chunk: number, data: Blob) {
    return new Promise((resolve, reject) => {
      const readEventHandler = async (event: any) => {
        if (event.target.error) {
          reject(event.target.error);
        }
        let data = new Uint8Array(event.target.result);
        const encrypted = await encrypt(password, data);

        // encryptedChunks.push(encrypted);
        uploadChunk(chunk, encrypted).then(resolve).catch(reject);
      };

      const reader = new FileReader();
      reader.onload = readEventHandler;
      reader.readAsArrayBuffer(data);
    });
  }

  async function onChangeHandler(event: React.ChangeEvent<HTMLInputElement>) {
    const file = (event?.target?.files || [])[0];
    const chunks = Math.ceil(file.size / CHUNK_SIZE);

    fileMetaData = {
      name: file.name,
      type: file.type,
      lastModified: file.lastModified,
    };

    console.log(fileMetaData);

    let currentChunk;
    let chunkStart;
    let chunkEnd;
    console.log('chunks number', chunks);
    for (let chunkNumber = 0; chunkNumber < chunks; chunkNumber++) {
      chunkStart = chunkNumber * CHUNK_SIZE;
      chunkEnd = Math.min(chunkStart + CHUNK_SIZE, file.size);
      console.log('i created a chunk of ' + chunkStart + '-' + chunkEnd + 'minus 1	');
      currentChunk = file.slice(chunkStart, chunkEnd);
      console.log('chunkNumber', chunkNumber);
      console.log(typeof currentChunk);
      await processChunk(chunkNumber, currentChunk);
      // const chunkForm = new FormData();
      // chunkForm.append('file', currentChunk, file.name);
    }

    console.log('done', encryptedChunks);
  }

  async function onClickHandler() {
    let decryptedChunks: any[] = [];
    for (let chunk of encryptedChunks) {
      console.log('decrypting', chunk);
      const blob = await fetch(`/_storage/${chunk.id}`);
      // const uint8Array = new Uint8Array(await blob.arrayBuffer());
      decryptedChunks.push(await decrypt(password, await blob.text()));
      // decryptedChunks.push(data);
    }
    const file = new File(decryptedChunks, fileMetaData.name, {
      type: fileMetaData.type,
      lastModified: fileMetaData.lastModified,
    });
    console.log('done');
    setUrl(URL.createObjectURL(file));
  }

  return (
    <form>
      <input type="file" onChange={onChangeHandler} />
      <button type="button" onClick={onClickHandler}>
        decrypt file
      </button>
      {url ? (
        <a href={url} download={fileMetaData.name}>
          download
        </a>
      ) : (
        ''
      )}
    </form>
  );
};

export default FileUpload;
