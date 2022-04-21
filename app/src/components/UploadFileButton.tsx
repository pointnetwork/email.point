import React, { useRef, useState } from 'react';
import { PaperClipIcon } from '@heroicons/react/outline';

import Spinner from '@components/Spinner';

export function getFileString(file: File) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    // const formData = new FormData();
    // its also possible to new Blob to send text that will be saved in a fle like so:
    // formData.append('blob', new Blob(['Hello Cafe DADOU HAMMOCK\n']), 'somefile.txt')
    // formData.append(file.name, file);

    const { type, name } = file;

    reader.onload = (event) => {
      // The file's text will be printed here
      const content = event?.target?.result;
      resolve({
        name,
        type,
        content,
      });
    };

    reader.readAsText(file);

    // const { data } = await windowWithPoint.point.storage.postFile(formData);

    // return `/_storage/${data}`;
  });
}
const UploadFileButton: React.FC<{ onAttachmentAdded: Function }> = (props) => {
  const { onAttachmentAdded } = props;
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function onAttachmentHandler(event: React.ChangeEvent<HTMLInputElement>) {
    const file = (event?.target?.files || [])[0];
    if (!file) {
      return;
    }
    setUploading(true);
    getFileString(file)
      .then((file) => {
        onAttachmentAdded(file);
        setUploading(false);
      })
      .catch((error) => {
        setUploading(false);
      });
  }

  return (
    <div>
      <input type="file" ref={fileInputRef} className="hidden" onChange={onAttachmentHandler} />
      {uploading ? (
        <Spinner className="w-5 h-5" />
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="
            text-sm
            rounded 
            w-12 
            h-12 
            flex 
            justify-center 
            items-center 
            ml-2
            hover:bg-gray-100
            dark:hover:bg-gray-700
          "
        >
          <PaperClipIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default UploadFileButton;
