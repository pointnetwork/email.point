import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { StarIcon, CheckIcon } from '@heroicons/react/solid';
import { StarIcon as StarIconOutline, PaperClipIcon } from '@heroicons/react/outline';
import dayjs from 'dayjs';

import { actions as uiActions } from '@store/modules/ui';

import Spinner from '@components/Spinner';

type TableRowProps = {
  email: Email;
  onChecked: (email: Email) => void;
  onMarkAsImportant: (email: Email) => Promise<void>;
};

const TableRow: React.FC<TableRowProps> = (props) => {
  const { email, onChecked, onMarkAsImportant } = props;
  const [loading, setLoading] = useState<boolean>(false);

  const dispatch = useDispatch();

  function sendToSender(event: React.MouseEvent<HTMLElement>) {
    event.stopPropagation();
    window.location.href = `/compose?toIdentity=${email.fromIdentity}`;
  }

  function markAsImportant(event: React.MouseEvent<HTMLElement>) {
    event.stopPropagation();
    event.preventDefault();
    setLoading(true);
    onMarkAsImportant(email)
      .then(() => {
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
  }

  function checkEmail(event: React.MouseEvent<HTMLElement>) {
    event.stopPropagation();
    event.preventDefault();
    onChecked(email);
  }

  function openEmail() {
    window.location.href = `/show?id=${email.encryptedMessageId}`;
  }

  return (
    <tr
      className="
        bg-white
        border-b
        dark:bg-gray-800
        dark:border-gray-700
        hover:bg-gray-100
        hover:dark:bg-gray-900
        cursor-pointer
      "
      onClick={openEmail}
    >
      <td className="px-4 py-2 align-middle">
        <button
          onClick={checkEmail}
          className="
            border-2
            rounded
            w-6
            h-6
            border-gray-300
            text-xs
            text-gray-400
            mr-2
          "
        >
          {email.checked ? <CheckIcon className="w-5 h-5" /> : <div className="w-5 h-5"></div>}
        </button>
        <button
          onClick={markAsImportant}
          className="
            border-1
            w-10
            h-10
            text-sm
            p-2
            text-gray-400
          "
        >
          {loading ? (
            <Spinner className="w-5 h-5" />
          ) : email.important ? (
            <StarIcon className="w-5 h-5" />
          ) : (
            <StarIconOutline className="w-5 h-5" />
          )}
        </button>
      </td>
      <td className="px-4 py-3 text-sm align-middle">
        <span
          onClick={sendToSender}
          className="w-full cursor-pointer hover:underline hover:font-semibold"
        >
          @{email.fromIdentity}
        </span>
      </td>
      <td className="px-4 py-3 text-sm align-middle">
        <p className="whitespace-nowrap overflow-hidden text-ellipsis max-w-xs">{email.subject}</p>
      </td>
      <td className="px-4 py-3 text-sm align-middle">
        <p className="whitespace-nowrap overflow-hidden text-ellipsis max-w-xs">{email.message}</p>
      </td>
      <td>
        {email.attachments && email.attachments.length ? (
          <PaperClipIcon className="w-5 h-5 font-gray-500" />
        ) : (
          ''
        )}
      </td>
      <td className="px-4 py-3 text-sm align-middle">
        {dayjs(email.createdAt).format('MMMM DD, hh:mm')}
      </td>
    </tr>
  );
};

export default TableRow;
