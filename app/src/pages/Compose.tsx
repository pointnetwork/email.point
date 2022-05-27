import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import { MailIcon, PaperClipIcon } from '@heroicons/react/outline';
import { UploadIcon } from '@heroicons/react/solid';

import Spinner from '@components/Spinner';
import AttachmentBag from '@components/AttachmentBag';
import RecipientsInput from '@components/RecipientsInput';
import IdentitySpan from '@components/IdentitySpan';

import { getEmailData } from '@services/EmailService';
import * as ContractService from '@services/ContractService';
import * as IdentityService from '@services/IdentityService';
import * as StorageService from '@services/StorageService';
import * as WalletService from '@services/WalletService';

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

type EncryptedAttachment = {
  storedEncryptedMessageId: string;
  encryptedSymmetricObjJSON: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
};

async function getEncryptedAttachments(
  attachments: File[],
  publickKey: string
): Promise<EncryptedAttachment[]> {
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

function addRecipientFactory(
  setRecipientsFunction: (value: React.SetStateAction<string[]>) => void
) {
  return (recipient: Identity) => {
    setRecipientsFunction((_recipients) => {
      if (_recipients.indexOf(recipient) !== -1) {
        return _recipients;
      }
      const recipients = [..._recipients];
      recipients.push(recipient);
      return recipients;
    });
  };
}

function removeRecipientFactory(
  setRecipientsFunction: (value: React.SetStateAction<string[]>) => void
) {
  return (recipient: Identity) => {
    setRecipientsFunction((_recipients) => {
      const recipients = [..._recipients];
      const index = recipients.indexOf(recipient);
      recipients.splice(index, 1);
      return recipients;
    });
  };
}

const Compose: React.FC<{}> = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const identity = useSelector(identitySelectors.getIdentity);
  const publicKey = useSelector(identitySelectors.getPublicKey);

  const [showCC, setShowCC] = useState<boolean>(false);
  const [showBCC, setShowBCC] = useState<boolean>(false);

  const dispatch = useDispatch();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [searchParams] = useSearchParams();

  const [isReply, setIsReply] = useState<Boolean>(false);
  const [showRecipients, setShowRecipients] = useState<Boolean>(false);
  const [recipients, setRecipients] = useState<Identity[]>([]);
  const [ccRecipients, setCCRecipients] = useState<Identity[]>([]);
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
    setCCRecipients([]);
    setSubject('');
    setMessage('');
    setAttachments([]);
    setIsReply(false);
  }

  const addRecipient = useCallback(addRecipientFactory(setRecipients), [recipients]);
  const removeRecipient = useCallback(removeRecipientFactory(setRecipients), [recipients]);
  const addCCRecipient = useCallback(addRecipientFactory(setCCRecipients), [ccRecipients]);
  const removeCCRecipient = useCallback(removeRecipientFactory(setCCRecipients), [ccRecipients]);

  async function setReplyEmailData(replyToEmailId: string) {
    try {
      const replyToEmail = await getEmailData(replyToEmailId);
      setIsReply(true);
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
    const { replyTo, to = '', subject = '', message = '' } = Object.fromEntries([...searchParams]);
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
    // autocomplete from query params
    if (to) {
      setRecipients([to]);
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
        setLoading(false);
      })
      .catch((error) => {
        dispatch(
          uiActions.showErrorNotification({
            message: 'Something went wrong, try again later.',
          })
        );
        setLoading(false);
      });
  }

  async function addRecipientToEmail(
    emailId: number,
    recipient: Identity,
    attachments: File[] = [],
    cc: boolean = false
  ) {
    const [address, publicKey] = await Promise.all([
      IdentityService.identityToOwner(recipient),
      IdentityService.publicKeyByIdentity(recipient),
    ]);

    if (address === CONSTANTS.AddressZero) {
      throw new Error('Invalid identity');
    }

    const encryptedAttachments: EncryptedAttachment[] = await getEncryptedAttachments(
      attachments,
      publicKey
    );

    const encryptedData = await encryptAndSaveData(
      publicKey,
      JSON.stringify({
        subject,
        message,
        attachments: encryptedAttachments,
      })
    );

    await ContractService.sendContract({
      contract: 'PointEmail',
      method: 'addRecipientToEmail',
      params: [
        emailId,
        address,
        encryptedData.storedEncryptedMessageId,
        encryptedData.encryptedSymmetricObjJSON,
        cc,
      ],
    });
  }

  async function send() {
    if (!recipients.length) {
      dispatch(
        uiActions.showErrorNotification({
          message: 'A recipient is required',
        })
      );
      return;
    }

    // Get sender data
    const fromEncryptedAttachments: EncryptedAttachment[] = await getEncryptedAttachments(
      attachments,
      publicKey!
    );

    const fromEncryptedData = await encryptAndSaveData(
      publicKey!,
      JSON.stringify({
        subject,
        message,
        attachments: fromEncryptedAttachments,
      })
    );

    // Create the email
    const { events } = await ContractService.sendContract({
      contract: 'PointEmail',
      method: 'send',
      params: [
        fromEncryptedData.storedEncryptedMessageId,
        fromEncryptedData.encryptedSymmetricObjJSON,
      ],
    });

    const newEmailId = (events['EmailCreated'] as any).returnValues.id;

    // Add recipients
    const rejectedRecipients: string[] = [];

    for (let recipient of recipients) {
      try {
        await addRecipientToEmail(newEmailId, recipient, attachments, false);
      } catch (error) {
        rejectedRecipients.push(recipient);
      }
    }

    for (let ccRecipient of ccRecipients) {
      try {
        await addRecipientToEmail(newEmailId, ccRecipient, attachments, true);
      } catch (error) {
        rejectedRecipients.push(ccRecipient);
      }
    }

    if (rejectedRecipients.length) {
      dispatch(
        uiActions.showErrorNotification({
          message: `${rejectedRecipients.join(', ')} recipients have failed.`,
        })
      );
      cleanForm();
      return;
    }

    dispatch(
      uiActions.showSuccessNotification({
        message: 'Email sent successfully.',
      })
    );
    cleanForm();
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

  const removeAttachment = useCallback(
    (attachment: File) => {
      setAttachments((_attachments) => {
        const attachments = [..._attachments];
        const index = attachments.indexOf(attachment);
        attachments.splice(index, 1);
        return attachments;
      });
    },
    [attachments]
  );

  const onShowRecipientsHandler = (event: React.MouseEvent) => {
    setShowRecipients(!showRecipients);
  };

  return (
    <div className="container px-6 mx-auto grid">
      <h2 className="my-3 text-gray-700 dark:text-gray-200">
        <div className="text-2xl font-semibold">Compose</div>
        {identity ? (
          <div>
            From: <IdentitySpan identity={identity} />
          </div>
        ) : (
          ''
        )}
      </h2>
      <form
        onSubmit={onSendHandler}
        className="px-4 py-3 mb-8 bg-white rounded-lg shadow-md dark:bg-gray-800"
      >
        <div className={`w-full flex justify-end py-3 ${isReply ? 'block' : 'hidden'}`}>
          <button
            className="underline text-blue-500 dark:text-blue-300 text-sm"
            type="button"
            onClick={onShowRecipientsHandler}
          >
            Recipients
          </button>
        </div>
        <div className={!isReply || showRecipients ? 'block' : 'hidden'}>
          <RecipientsInput
            label="To"
            placeholder="Email Recipient Identities"
            recipients={recipients}
            disabled={loading}
            addRecipient={addRecipient}
            removeRecipient={removeRecipient}
          />

          <div className="flex flex-row mb-5 justify-end">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              {[
                { leyend: 'CC', onClickHandler: () => setShowCC(!showCC) },
                { leyend: 'BCC', onClickHandler: () => setShowBCC(!showBCC) },
              ].map(({ leyend, onClickHandler }, index) => (
                <button
                  onClick={onClickHandler}
                  type="button"
                  className={`
                  py-2 
                  px-4 
                  text-sm 
                  font-medium 
                  text-gray-900 
                  bg-white 
                  border 
                  border-gray-200 
                  hover:bg-gray-100 
                  hover:text-green-600 
                  focus:z-10 focus:ring-2 
                  focus:ring-green-600 
                  focus:text-green-600 
                  dark:bg-gray-700 
                  dark:border-gray-600 
                  dark:text-white 
                  dark:hover:text-white 
                  dark:hover:bg-gray-600 
                  dark:focus:ring-green-400 
                  dark:focus:text-white
                  focus:border-green-400 
                  focus:outline-nonemb-5
                  focus:shadow-outline-green 
                  dark:focus:shadow-outline-gray
                  ${index === 0 ? 'rounded-l-lg border-r-0' : 'rounded-r-lg'}
                `}
                >
                  {leyend}
                </button>
              ))}
            </div>
          </div>

          <RecipientsInput
            className={showCC || ccRecipients.length ? 'block' : 'hidden'}
            label="CC"
            placeholder="Email CC Recipient Identities"
            recipients={ccRecipients}
            disabled={loading}
            addRecipient={addCCRecipient}
            removeRecipient={removeCCRecipient}
          />
        </div>

        <label className="block text-sm">
          <span className="text-gray-700 dark:text-gray-400">Subject</span>
          <div className="relative text-gray-500 focus-within:text-green-600 dark:focus-within:text-green-400">
            <input
              disabled={!!loading}
              required={true}
              className="
                block
                w-full
                pl-10
                mt-1
                mb-5
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

        <label className="block mt-4 text-sm">
          <span className="text-gray-700 dark:text-gray-400">Message</span>
          <textarea
            disabled={!!loading}
            required={true}
            ref={messageInputRef}
            className="
              block 
              w-full 
              mt-1 
              mb-5
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
          <div className="text-sm flex flex-col">
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

        <div className="flex flex-row mt-4">
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
