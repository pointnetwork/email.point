import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import { MailIcon, UserIcon, PaperClipIcon, XCircleIcon } from '@heroicons/react/outline';
import { UploadIcon } from '@heroicons/react/solid';

import Spinner from '@components/Spinner';

import { getEmailData } from '@services/EmailService';
import * as ContractService from '@services/ContractService';
import * as IdentityService from '@services/IdentityService';
import * as StorageService from '@services/StorageService';
import * as WalletService from '@services/WalletService';
import * as EncryptionService from '@services/EncryptionService';

import { actions as uiActions } from '@store/modules/ui';
import { selectors as identitySelectors } from '@store/modules/identity';

import CONSTANTS from '../constants';
import dayjs from 'dayjs';

enum ERRORS {
  INVALID_RECIPIENT,
}

type FileContent = string | ArrayBuffer | null | undefined;

function getFileContent(file: File): Promise<FileContent> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event?.target?.result;
      resolve(content);
    };
    reader.readAsDataURL(file);
  });
}

const AttachmentBag: React.FC<{ attachment: File; onRemoveHandler: Function }> = (props) => {
  const { attachment, onRemoveHandler } = props;
  return (
    <div
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
        m-1
      "
    >
      <button type="button" onClick={() => onRemoveHandler(attachment)}>
        <XCircleIcon className="w-6 h-6 mr-2" />
      </button>
      <span className="font-semibold">{attachment.name}</span>
    </div>
  );
};

const RecipientBag: React.FC<{ recipient: Identity; onRemoveHandler: Function }> = (props) => {
  const { recipient, onRemoveHandler } = props;
  return (
    <div
      className="
        rounded
        bg-red-200
        py-1
        px-2
        text-sm
        text-red-500
        flex
        flex-row
        items-center
        justify-center
        m-1
      "
    >
      <button type="button" onClick={() => onRemoveHandler(recipient)}>
        <XCircleIcon className="w-6 h-6 mr-2" />
      </button>
      <span className="font-semibold">@{recipient}</span>
    </div>
  );
};

const RecipientsInput: React.FC<{
  recipients: Identity[];
  loading: boolean;
  addRecipient: Function;
  removeRecipient: Function;
}> = (props) => {
  const { recipients, loading, addRecipient, removeRecipient } = props;
  const [identity, setIdentity] = useState<Identity>('');
  const [validating, setValidating] = useState<boolean>(false);

  const dispatch = useDispatch();

  function onAddRecipientHandler(event: React.MouseEvent<HTMLElement>) {
    if (validating) {
      return;
    }

    if (identity === '') {
      return;
    }

    setValidating(true);
    IdentityService.identityToOwner(identity)
      .then((owner) => {
        setValidating(false);
        if (owner === CONSTANTS.AddressZero) {
          dispatch(
            uiActions.showErrorNotification({
              message: 'Invalid recipient identity.',
            })
          );
          return;
        }
        addRecipient(identity);
        setIdentity('');
      })
      .catch((error) => {
        console.error(error);
        dispatch(
          uiActions.showErrorNotification({
            message: 'Something went wrong',
          })
        );
        setValidating(false);
      });
  }

  function onRemoveRecipientHandler(event: React.MouseEvent<HTMLElement>) {
    removeRecipient(identity);
    setIdentity('');
  }

  function onIdentityChangeHandler(event: React.ChangeEvent<HTMLInputElement>) {
    setIdentity(event.target.value);
  }

  return (
    <label className="block text-sm mb-3">
      <span className="text-gray-700 dark:text-gray-400 mb-2">To</span>
      <div className="flex flex-col md:flex-row w-full">
        <div className="relative text-gray-500 focus-within:text-green-600 dark:focus-within:text-green-400">
          <input
            disabled={!!loading || !!validating}
            className="
              block
              pl-10
              w-full
              flex-1
              border-2
              rounded
              text-sm
              text-black
              dark:text-gray-300
              dark:border-gray-600
              dark:bg-gray-700
              focus:border-green-400
              focus:outline-nonemb-5
              focus:shadow-outline-green
              dark:focus:shadow-outline-gray
              form-input
            "
            value={identity}
            onChange={onIdentityChangeHandler}
            placeholder="Email Recipient Identity"
          />
          <div className="absolute inset-y-0 flex items-center ml-3 pointer-events-none">
            <UserIcon className="w-5 h-6" />
          </div>
        </div>
        <button
          type="button"
          onClick={onAddRecipientHandler}
          disabled={!!loading || !!validating}
          className="
            rounded
            border-1
            bg-green-500
            text-gray-100
            px-10
            py-2
            mt-2
            md:mt-0
            sm:ml-0
            md:ml-2
          "
        >
          Add Recipient
        </button>
      </div>
      {recipients.length ? (
        <div className="text-sm flex flex-col mb-3 mt-3">
          <span className="mb-1">Recipients:</span>
          <div className="flex flex-row flex-wrap">
            {recipients.map((recipient, index) => (
              <RecipientBag
                recipient={recipient}
                key={index}
                onRemoveHandler={onRemoveRecipientHandler}
              />
            ))}
          </div>
        </div>
      ) : (
        ''
      )}
    </label>
  );
};

const FILE_MAX_SIZE = 1048576;

async function encryptAndSaveData(
  publicKey: string,
  data: string
): Promise<{ storedEncryptedMessageId: string; encryptedSymmetricObjJSON: string }> {
  const { encryptedMessage, encryptedSymmetricObjJSON } = await WalletService.encryptData(
    publicKey,
    data
  );
  const storedEncryptedMessageId = await StorageService.putString(encryptedMessage);
  return {
    storedEncryptedMessageId,
    encryptedSymmetricObjJSON,
  };
}

async function encryptAndStoreStringMulti(
  data: string,
  publicKeys: string[]
): Promise<{ storedEncryptedMessageId: string; encryptedSymmetricKeys: Record<string, string> }> {
  const { encryptedMessage, encryptedSymmetricKeys } = await EncryptionService.encryptStringMulti(
    data,
    publicKeys
  );
  const storedEncryptedMessageId = await StorageService.putString(encryptedMessage);
  return {
    storedEncryptedMessageId,
    encryptedSymmetricKeys,
  };
}

const Compose: React.FC<{}> = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const identity = useSelector(identitySelectors.getIdentity);
  const publicKey = useSelector(identitySelectors.getPublicKey);

  const dispatch = useDispatch();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [searchParams] = useSearchParams();

  const [recipients, setRecipients] = useState<Identity[]>([]);
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [attachments, setAttachments] = useState<File[]>([]);

  function subjectChangedHandler(event: React.ChangeEvent<HTMLInputElement>) {
    setSubject(event.target.value);
  }

  function messageChangedHandler(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setMessage(event.target.value);
  }

  function cleanForm() {
    setRecipients([]);
    setSubject('');
    setMessage('');
    setAttachments([]);
  }

  function addRecipient(recipient: Identity) {
    setRecipients((_recipients) => {
      const recipients = [..._recipients];
      recipients.push(recipient);
      return recipients;
    });
  }

  function removeRecipient(recipient: Identity) {
    setRecipients((_recipients) => {
      const recipients = [..._recipients];
      const index = recipients.indexOf(recipient);
      recipients.splice(index, 1);
      return recipients;
    });
  }

  async function setReplyEmailData(replyToMessageId: string) {
    try {
      const replyToEmail = await getEmailData(replyToMessageId);
      setRecipients([replyToEmail.fromIdentity!]);
      setSubject(`RE: ${replyToEmail.subject!}`);
      setMessage(
        `\n\n| On ${dayjs(replyToEmail.createdAt).format('MMMM DD, YYYY hh:mm')} <@${
          replyToEmail.fromIdentity
        }> wrote:\n| ${replyToEmail.message!.split('\n').join('\n| ')}`
      );
      setTimeout(() => {
        messageInputRef.current!.focus();
        messageInputRef.current!.setSelectionRange(0, 0);
      }, 1);
    } catch (error) {
      console.error(error);
      dispatch(
        uiActions.showErrorNotification({
          message: 'Something went wrong',
        })
      );
    }
  }

  useEffect(() => {
    if (!identity) {
      return;
    }
    const { replyTo, subject = '', message = '' } = Object.fromEntries([...searchParams]);
    if (replyTo) {
      // get email data and autocomplete the form
      setReplyEmailData(replyTo)
        .then(() => {
          setLoading(false);
        })
        .catch((error) => {
          console.error(error);
          setLoading(false);
        });
      return;
    }
    setSubject(subject);
    setMessage(message);
    setLoading(false);
  }, [identity]);

  function onSendHandler(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    send()
      .then(() => {
        dispatch(
          uiActions.showSuccessNotification({
            message: 'Email sent successfully.',
          })
        );
        cleanForm();
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        let message = 'Something went wrong, try again later.';
        if (error === ERRORS.INVALID_RECIPIENT) {
          message = 'Invalid Recipient';
        }
        dispatch(
          uiActions.showErrorNotification({
            message,
          })
        );
        setLoading(false);
      });
  }

  async function send() {
    if (!recipients.length) {
      throw ERRORS.INVALID_RECIPIENT;
    }

    const recipientsData = await Promise.all(
      recipients.map(async (identity) => {
        const [owner, publicKey] = await Promise.all([
          IdentityService.identityToOwner(identity),
          IdentityService.publicKeyByIdentity(identity),
        ]);
        return { identity, owner, publicKey };
      })
    );

    const { storedEncryptedMessageId, encryptedSymmetricKeys } = await encryptAndStoreStringMulti(
      JSON.stringify({
        subject,
        message,
      }),
      [...recipientsData.map(({ publicKey }) => publicKey), publicKey!]
    );

    const recipientsDataWithoutSender = recipientsData.filter(({ owner }) => owner !== identity);

    await ContractService.sendContract({
      contract: 'PointEmail',
      method: 'send',
      params: [
        encryptedSymmetricKeys[publicKey!], // sender encryption data
        recipientsDataWithoutSender.map(({ owner }) => owner), // recipients addresses
        recipientsDataWithoutSender.map(({ publicKey }) => encryptedSymmetricKeys[publicKey]), // encryption data for each recipient
        storedEncryptedMessageId, // email stored message id
      ],
    });

    /*

    async function getEncryptedAttachments(attachments: File[], publickKey: string) {
      const encryptedAttachmentsData = await Promise.all(
        attachments.map(async (attachment) => {
          const attachmentContent = await getFileContent(attachment);
          // encrypt file content and save it
          const encryptedFileContent = await encryptAndSaveData(
            publickKey,
            attachmentContent as string
          );
          const attachmentToSave = {
            name: attachment.name,
            size: attachment.size,
            type: attachment.type,
            lastModified: attachment.lastModified,
            ...encryptedFileContent,
          };
          return attachmentToSave;
        })
      );
      return encryptedAttachmentsData;
    }

    let fromEncryptedAttachments;
    let toEncryptedAttachments;
    if (attachments) {
      [fromEncryptedAttachments, toEncryptedAttachments] = await Promise.all([
        getEncryptedAttachments(attachments, publicKey!),
        getEncryptedAttachments(attachments, toPublicKey),
      ]);
    }

    */

    /*
    const [fromEncryptedData, toEncryptedData] = await Promise.all([
      encryptAndSaveData(
        publicKey!,
        JSON.stringify({
          subject,
          message,
          attachments: fromEncryptedAttachments,
        })
      ),
      encryptAndSaveData(
        toPublicKey,
        JSON.stringify({
          subject,
          message,
          attachments: toEncryptedAttachments,
        })
      ),
    ]);

    await ContractService.sendContract({
      contract: 'PointEmail',
      method: 'send',
      params: [
        toOwner,
        fromEncryptedData.storedEncryptedMessageId,
        fromEncryptedData.encryptedSymmetricObjJSON,
        toEncryptedData.storedEncryptedMessageId,
        toEncryptedData.encryptedSymmetricObjJSON,
      ],
    });
    */
  }

  function addAttachment(event: React.ChangeEvent<HTMLInputElement>) {
    const attachment = (event?.target?.files || [])[0];
    if (!attachment) {
      return;
    }

    if (attachment.size > FILE_MAX_SIZE) {
      dispatch(
        uiActions.showErrorNotification({
          message: 'File is too big',
        })
      );
      return;
    }

    setAttachments((_attachments) => {
      const attachments = [..._attachments];
      attachments.push(attachment);
      return attachments;
    });
    if (fileInputRef!.current?.value) {
      fileInputRef.current.value = '';
    }
  }

  function removeAttachment(attachment: File) {
    setAttachments((_attachments) => {
      const attachments = [..._attachments];
      const index = attachments.indexOf(attachment);
      attachments.splice(index, 1);
      return attachments;
    });
  }

  return (
    <div className="container px-6 mx-auto grid">
      <h2 className="my-3 text-gray-700 dark:text-gray-200">
        <div className="text-2xl font-semibold">Compose</div>
        <div>From: @{identity}</div>
      </h2>
      <form
        onSubmit={onSendHandler}
        className="px-4 py-3 mb-8 bg-white rounded-lg shadow-md dark:bg-gray-800"
      >
        <RecipientsInput
          recipients={recipients}
          loading={loading}
          addRecipient={addRecipient}
          removeRecipient={removeRecipient}
        />

        <label className="block text-sm my-3">
          <span className="text-gray-700 dark:text-gray-400">Subject</span>
          <div className="relative text-gray-500 focus-within:text-green-600 dark:focus-within:text-green-400">
            <input
              disabled={!!loading}
              required={true}
              className="
                block
                w-full
                pl-10
                mt-2
                border-2
                rounded
                text-sm
                text-black
                dark:text-gray-300
                dark:border-gray-600
                dark:bg-gray-700
                focus:border-green-400
                focus:outline-none
                focus:shadow-outline-green
                dark:focus:shadow-outline-gray
                form-input
              "
              placeholder="Email Subject"
              value={subject}
              onChange={subjectChangedHandler}
            />
            <div className="absolute inset-y-0 flex items-center ml-3 pointer-events-none">
              <MailIcon className="w-5 h-6" />
            </div>
          </div>
        </label>

        <label className="block my-2 text-sm mb-3">
          <span className="text-gray-700 dark:text-gray-400">Message</span>
          <textarea
            disabled={!!loading}
            required={true}
            ref={messageInputRef}
            className="
              block 
              w-full 
              mt-2
              text-sm
              border-2
              rounded
              dark:text-gray-300 
              dark:border-gray-600 
              dark:bg-gray-700 
              form-textarea 
              focus:border-green-400 
              focus:outline-none 
              focus:shadow-outline-green 
              dark:focus:shadow-outline-gray
              whitespace-pre-line
            "
            rows={10}
            placeholder="Email message."
            value={message}
            onChange={messageChangedHandler}
          ></textarea>
        </label>
        {attachments.length ? (
          <div className="text-sm flex flex-col mb-3">
            <span className="mr-2 mb-2">Attachments:</span>
            <div className="flex flex-row flex-wrap">
              {attachments.map((attachment, index) => (
                <AttachmentBag
                  attachment={attachment}
                  key={index}
                  onRemoveHandler={removeAttachment}
                />
              ))}
            </div>
          </div>
        ) : (
          ''
        )}

        <div className="flex flex-row mt-5">
          <button
            type="submit"
            disabled={!!loading}
            className="
              w-lg
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
              text-sm
            "
          >
            {loading ? (
              <>
                <Spinner className="w-5 h-5 mr-2" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <UploadIcon className="w-5 h-5 mr-2" />
                <span>Encrypt & Send Email</span>
              </>
            )}
          </button>

          <input type="file" ref={fileInputRef} className="hidden" onChange={addAttachment} />
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
            <PaperClipIcon className="w-5 h-5 md-w-6 md-h-6" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Compose;
