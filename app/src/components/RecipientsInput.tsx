import React, { useState } from 'react';
import { UserIcon } from '@heroicons/react/outline';
import { useDispatch } from 'react-redux';
import { actions as uiActions } from '@store/modules/ui';

import * as IdentityService from '@services/IdentityService';

import RecipientBag from '@components/RecipientBag';

import CONSTANTS from '../constants';

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

export default RecipientsInput;
