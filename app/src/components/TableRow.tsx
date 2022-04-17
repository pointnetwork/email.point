import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { StarIcon, CheckIcon } from '@heroicons/react/solid';
import { StarIcon as StarIconOutline } from '@heroicons/react/outline';
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

  function markAsImportant() {
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

  return (
    <tr className="text-gray-700 dark:text-gray-400">
      <td className="px-4 py-2 flex items-center">
        {onChecked && (
          <button
            onClick={() => onChecked(email)}
            className="border-2 rounded w-6 h-6 border-gray-300 text-xs text-gray-400 mr-2"
          >
            {email.checked && <CheckIcon className="w-5 h-5" />}
          </button>
        )}
        <button onClick={markAsImportant} className="border-1 w-10 h-10 text-sm p-2 text-gray-400">
          {loading ? (
            <Spinner className="w-5 h-5" />
          ) : email.important ? (
            <StarIcon className="w-5 h-5" />
          ) : (
            <StarIconOutline className="w-5 h-5" />
          )}
        </button>
      </td>
      <td className="px-4 py-3 text-sm">
        <span className="w-full">@{email.fromIdentity}</span>
      </td>
      <td className="px-4 py-3 text-sm">{email.subject}</td>
      <td className="px-4 py-3 text-sm">
        <Link to={`/show?id=${email.encryptedMessageId}`}>
          <span className="w-full underline">Decrypt Message</span>
        </Link>
      </td>
      <td className="px-4 py-3 text-sm">{dayjs(email.createdAt).format('MMMM DD, hh:mm')}</td>
    </tr>
  );
};

export default TableRow;
