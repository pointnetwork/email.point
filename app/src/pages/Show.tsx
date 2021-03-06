import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import dayjs from 'dayjs';
import { ReplyIcon, CloudDownloadIcon, MailOpenIcon } from '@heroicons/react/solid';
import { PaperClipIcon } from '@heroicons/react/outline';

import { getEmailData } from '@services/EmailService';

import * as EmailService from '@services/EmailService';
import * as IdentityService from '@services/IdentityService';

import { actions as uiActions } from '@store/modules/ui';

import RedirectWithTimeout from '@components/RedirectWithTimeout';
import Spinner from '@components/Spinner';
import IdentitToComposeViewButton from '@components/IdentityToComposeViewButton';
import { getAndDecryptFile } from '@services/StorageService';

const Attachment: React.FC<{ attachment: EncryptedAttachment; encryptionKey: string }> = (
  props
) => {
  const { attachment, encryptionKey } = props;
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  function getAttachmentFile() {
    if (loading || url) {
      return;
    }
    setLoading(true);
    getAndDecryptFile(attachment, encryptionKey)
      .then((file: File) => {
        setUrl(URL.createObjectURL(file));
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
          m-1
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
        m-1
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

const IdentitiesListRow: React.FC<{
  identities: Record<Address, Identity | undefined>;
  title: string;
}> = (props) => {
  const { identities, title } = props;
  return (
    <div
      className="
        text-sm
        mb-2
      "
    >
      <span className="font-bold">{title}:</span>
      <span
        className="
          text-gray-600
          ml-1 
        "
      >
        {Object.values(identities).map((identity, index) => {
          let element;
          if (!identity) {
            element = <span>Invalid</span>;
          } else {
            element = <IdentitToComposeViewButton identity={identity} />;
          }
          return (
            <>
              {index > 0 && ', '}
              {element}
            </>
          );
        })}
      </span>
    </div>
  );
};

const Show: React.FC<{}> = () => {
  const [emailData, setEmailData] = useState<any>();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState<boolean>(true);
  const [toIdentities, setToIdentities] = useState<Record<Address, Identity | undefined>>({});
  const [ccIdentities, setCCIdentities] = useState<Record<Address, Identity | undefined>>({});

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

  useEffect(() => {
    if (!emailData) {
      return;
    }
    const { to, cc } = emailData;
    if (to.length) {
      IdentityService.ownersToIdentities(to).then((identities) => {
        setToIdentities(identities);
      });
    }

    if (cc.length) {
      IdentityService.ownersToIdentities(cc).then((identities) => {
        setCCIdentities(identities);
      });
    }
  }, [emailData]);

  const [markingAsRead, setMarkingAsRead] = useState<boolean>(false);
  const markAsRead = async () => {
    if (markingAsRead) {
      return;
    }
    try {
      setMarkingAsRead(true);
      await EmailService.markEmailAsRead(emailData.id, true);
      dispatch(
        uiActions.showSuccessNotification({
          message: 'Done.',
        })
      );
      setMarkingAsRead(false);
      setEmailData((emailData: any) => {
        emailData.read = true;
        return emailData;
      });
    } catch (error) {
      console.error(error);
      setMarkingAsRead(false);
      dispatch(
        uiActions.showErrorNotification({
          message: 'Something went wrong.',
        })
      );
    }
  };

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
                <span className="font-bold">From:</span>
                <span
                  className="
                    text-gray-600
                    ml-2
                    text-sm
                  "
                >
                  @{emailData.fromIdentity}&nbsp;
                  {`<${emailData.from}>`}
                </span>
              </div>
              <div className="text-sm mt-2 md:mt-0">
                <span className="font-bold">Date:</span>
                <span
                  className="
                    text-gray-600
                    ml-2
                    text-sm
                  "
                >
                  {dayjs(emailData.createdAt).format('MMMM DD, hh:mm')}
                </span>
              </div>
            </div>
            {toIdentities && Object.keys(toIdentities).length ? (
              <IdentitiesListRow identities={toIdentities} title="To" />
            ) : (
              ''
            )}
            {ccIdentities && Object.keys(ccIdentities).length ? (
              <IdentitiesListRow identities={ccIdentities} title="Cc" />
            ) : (
              ''
            )}

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
            <div className="border-t border-gray-200 mt-2 mb-2"></div>
            <div className="mt-5 whitespace-pre-line">{emailData.message.split('| On')}</div>
            {emailData.attachments ? (
              <div className="flex flex-row flex-wrap mt-5 border-t border-gray-200 pt-2 text-sm">
                {emailData.attachments.map((attachment: EncryptedAttachment, index: number) => (
                  <Attachment
                    key={index}
                    attachment={attachment}
                    encryptionKey={emailData.encryptionKey}
                  />
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
              flex
              flex-col
              md:flex-row
              align-center
              items-center
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
                my-1
                w-full
                md:w-60
                mx-1
              "
              to={`/compose?replyTo=${emailData.id}`}
            >
              <ReplyIcon className="w-5 h-5 mr-2" />
              <span>Reply</span>
            </Link>
            {!emailData.read ? (
              <button
                className="
                flex
                flex-row
                rounded
                items-center
                border-2
                border-blue-600
                bg-blue-500
                text-white
                justify-center
                p-2
                mx-1
                w-full
                md:w-48
              "
                onClick={markAsRead}
                disabled={markingAsRead}
              >
                <MailOpenIcon className="w-5 h-5 mr-2" />
                <span>{markingAsRead ? 'Marking...' : 'Mark as read'}</span>
              </button>
            ) : (
              ''
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Show;
