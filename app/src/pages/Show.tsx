import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import dayjs from 'dayjs';
import { ReplyIcon, CloudDownloadIcon } from '@heroicons/react/solid';
import { PaperClipIcon } from '@heroicons/react/outline';

import { getEmailData } from '@services/EmailService';

import * as WalletService from '@services/WalletService';
import * as StorageService from '@services/StorageService';
import * as EmailService from '@services/EmailService';

import { actions as uiActions } from '@store/modules/ui';

import RedirectWithTimeout from '@components/RedirectWithTimeout';
import Spinner from '@components/Spinner';

type Attachment = {
  name: string;
  type: string;
  size: string;
  lastModified: number;
  storedEncryptedMessageId: string;
  encryptedSymmetricObjJSON: string;
};

const Attachment: React.FC<{ attachment: Attachment }> = (props) => {
  const { attachment } = props;
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  async function getEncryptedFile() {
    const encryptedFileContent = await StorageService.getString(
      attachment.storedEncryptedMessageId
    );
    const decryptedFileContent = await WalletService.decryptData(
      encryptedFileContent,
      attachment.encryptedSymmetricObjJSON
    );

    const blob = await (await fetch(decryptedFileContent)).blob();

    const file = new File([blob], attachment.name, {
      lastModified: attachment.lastModified,
      type: attachment.type,
    });
    setUrl(URL.createObjectURL(file));
  }

  function getAttachmentFile() {
    if (loading || url) {
      return;
    }
    setLoading(true);
    getEncryptedFile()
      .then(() => {
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
      });
  }

  if (url) {
    return (
      <a
        href={url}
        download={attachment.name}
        className="
          rounded
          bg-gray-200
          py-2
          px-4
          text-gray-500
          flex
          flex-row
          items-center
          justify-center
          underline
        "
      >
        <CloudDownloadIcon className="w-4 h-4 mr-2" />
        <span>Download {attachment.name}</span>
      </a>
    );
  }

  return (
    <div
      className="
        rounded 
        underline 
        cursor-pointer
        flex
        flex-row
        items-center
        justify-center
        rounded
        bg-gray-200
        py-2
        px-4
        text-gray-500
      "
      onClick={getAttachmentFile}
    >
      {loading ? (
        <>
          <Spinner className="w-4 h-4 mr-2" />
          <span>Decrypting file</span>
        </>
      ) : (
        <>
          <PaperClipIcon className="w-4 h-4 mr-2" />
          <span>Decrypt {attachment.name}</span>
        </>
      )}
    </div>
  );
};

const Show: React.FC<{}> = () => {
  const [emailData, setEmailData] = useState<any>();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState<boolean>(true);

  const emailId = searchParams.get('id');

  const dispatch = useDispatch();

  useEffect(() => {
    if (!emailId) {
      dispatch(
        uiActions.showErrorNotification({
          message: 'The message id is invalid',
        })
      );
      return;
    }

    getEmailData(emailId)
      .then((emailData) => {
        setEmailData(emailData);
        if (!emailData.read) {
          EmailService.markEmailAsRead(emailData.id, true);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        dispatch(
          uiActions.showErrorNotification({
            message: 'Something went wrong.',
          })
        );
        setLoading(false);
      });
  }, [emailId]);

  return (
    <>
      {!emailId ? (
        <RedirectWithTimeout to="/" timeout={3000} />
      ) : loading ? (
        <div className="container w-full p-10 flex flex-col items-center">
          <Spinner className="w-8 h-8" />
          <p className="mt-2">Loading message</p>
          <p className="font-bold">#{emailId}</p>
        </div>
      ) : (
        <div className="container w-full mx-auto md:px-5 grid">
          <div
            className="
              w-full
              px-5
              py-5
              md:px-10
              md:py-10
              mb-4
              bg-white
              rounded-lg
              shadow-md
              dark:bg-gray-800
            "
          >
            <h2 className="text-gray-700 dark:text-gray-200 text-lg font-semibold mb-5">
              {emailData.subject}
            </h2>
            <div
              className="
                mb-2
                flex
                flex-col
                justify-start
                md:flex-row
                md:justify-between
                md:items-center
              "
            >
              <div className="text-sm">
                <span className="font-bold">@{emailData.fromIdentity}</span>
                <span
                  className="
                    text-gray-600
                    ml-2
                    text-sm
                  "
                >
                  {`<${emailData.from}>`}
                </span>
              </div>
              <div className="text-gray-600 text-sm mt-2 md:mt-0">
                {dayjs(emailData.createdAt).format('MMMM DD, hh:mm')}
              </div>
            </div>
            <div
              className="
                text-sm
                mb-2
                hidden 
                md:block
              "
            >
              <span className="font-bold">Id:</span>
              <span
                className="
                  text-gray-600
                  ml-1
                  
                "
              >
                {emailData.encryptedMessageId}
              </span>
            </div>
            <div className="mt-5 whitespace-pre-line">{emailData.message.split('| On')}</div>
            {emailData.attachments ? (
              <div className="flex flex-row flex-wrap mt-5 border-t-2 border-gray-200 pt-2 text-sm">
                {emailData.attachments.map((attachment: Attachment, index: number) => (
                  <Attachment key={index} attachment={attachment} />
                ))}
              </div>
            ) : (
              ''
            )}
          </div>
          <div
            className="
              mb-4
              px-2
            "
          >
            <Link
              className="
                flex
                flex-row
                rounded
                items-center
                border-2
                border-green-600
                bg-green-500
                text-white
                justify-center
                p-2
                px-10
                mt-1
                mb-5
                w-40
              "
              to={`/compose?replyTo=${emailData.id}`}
            >
              <ReplyIcon className="w-5 h-5 mr-2" />
              <span>Reply</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
};

export default Show;
