import React, { useState, useCallback, memo } from 'react';
import { UserIcon } from '@heroicons/react/outline';
import { useDispatch } from 'react-redux';
import { actions as uiActions } from '@store/modules/ui';

import * as IdentityService from '@services/IdentityService';

import RecipientBag from '@components/RecipientBag';

import CONSTANTS from '../constants';

const RecipientsInput: React.FC<{
  label: string;
  placeholder?: string;
  recipients: Identity[];
  disabled: boolean;
  addRecipient: Function;
  removeRecipient: Function;
}> = (props) => {
  const { recipients, disabled, addRecipient, removeRecipient, label, placeholder } = props;
  const [identity, setIdentity] = useState<Identity>('');

  const dispatch = useDispatch();

  function validateAndAddNewRecipient(newRecipient: string) {
    if (newRecipient === '') {
      return;
    }

    IdentityService.identityToOwner(newRecipient)
      .then((owner) => {
        if (owner === CONSTANTS.AddressZero) {
          dispatch(
            uiActions.showErrorNotification({
              message: `${newRecipient} is an invalid recipient identity.`,
            })
          );
          return;
        }
        addRecipient(newRecipient);
      })
      .catch((error) => {
        console.error(error);
        dispatch(
          uiActions.showErrorNotification({
            message: 'Something went wrong',
          })
        );
      });
  }

  const onRemoveRecipientHandler = useCallback(
    (_recipient: Identity) => {
      removeRecipient(_recipient);
      setIdentity('');
    },
    [recipients]
  );

  const onIdentityChangeHandler = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newInputValue = event.target.value;
      if (newInputValue.slice(-1) === ',') {
        const newIdentityToAdd = newInputValue.slice(0, -1);
        validateAndAddNewRecipient(newIdentityToAdd);
        setIdentity('');
        return;
      }
      setIdentity(newInputValue);
    },
    [recipients, identity]
  );

  const onKeyDownHandler = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        console.log(identity);
        validateAndAddNewRecipient(identity);
        setIdentity('');
      }
    },
    [recipients, identity]
  );

  return (
    <label className="block text-sm mb-5">
      <span className="text-gray-700 dark:text-gray-400 mb-2">{label}</span>
      <div className="flex flex-col w-full">
        <div
          className="
            mt-1
            text-gray-500 
            focus-within:text-green-600 
            dark:focus-within:text-green-400
            border-2
            rounded
            text-sm
            dark:text-gray-300
            dark:border-gray-600
            dark:bg-gray-700
            focus:border-green-400
            focus:outline-nonemb-5
            focus:shadow-outline-green
            dark:focus:shadow-outline-gray
            flex
            flex-row
            flex-wrap
          "
        >
          {recipients.length ? (
            recipients.map((recipient, index) => (
              <RecipientBag
                recipient={recipient}
                key={index}
                onRemoveHandler={onRemoveRecipientHandler}
              />
            ))
          ) : (
            <div className="flex items-center ml-3 pointer-events-none">
              <UserIcon className="w-5 h-6" />
            </div>
          )}
          <input
            disabled={!!disabled}
            className="
              flex-1
              form-input
              text-sm
              text-black
              dark:bg-gray-700
              dark:text-gray-300
            "
            value={identity}
            onChange={onIdentityChangeHandler}
            onKeyDown={onKeyDownHandler}
            placeholder={placeholder}
          />
        </div>
      </div>
    </label>
  );
};

export default memo(RecipientsInput);
