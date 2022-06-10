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
  className?: string;
}> = (props) => {
  const { recipients, disabled, addRecipient, removeRecipient, label, placeholder, className } =
    props;
  const [identity, setIdentity] = useState<Identity>('');
  const [focus, setFocus] = useState<boolean>(false);

  const dispatch = useDispatch();

  function validateAndAddNewRecipient(_recipient: string) {
    const recipient = _recipient.replace(/^@/g, '');

    if (recipient === '') {
      return;
    }

    IdentityService.identityToOwner(recipient)
      .then((owner) => {
        if (owner === CONSTANTS.AddressZero) {
          dispatch(
            uiActions.showErrorNotification({
              message: `${recipient} is an invalid recipient identity.`,
            })
          );
          return;
        }
        addRecipient(recipient);
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
        validateAndAddNewRecipient(identity);
        setIdentity('');
        return;
      }

      // Remove last identity
      if (event.key === 'Backspace') {
        if (!recipients.length) {
          return;
        }
        if (identity.length) {
          return;
        }
        removeRecipient(recipients.slice(-1));
      }
    },
    [recipients, identity]
  );

  const onBlurHandler = useCallback(() => {
    validateAndAddNewRecipient(identity);
    setIdentity('');
    setFocus(false);
  }, [recipients, identity, focus]);

  return (
    <label className={`block text-sm mb-5 ${className}`}>
      <span className="text-gray-700 dark:text-gray-400 mb-2">{label}</span>
      <div className="flex flex-col w-full">
        <div
          className={`
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
            flex
            flex-row
            flex-wrap
            ${
              focus
                ? `border-green-400 outline-nonemb-5 shadow-outline-green dark:shadow-outline-gray`
                : ''
            }}  
          `}
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
            onFocus={() => setFocus(true)}
            onBlur={onBlurHandler}
            placeholder={placeholder}
          />
        </div>
      </div>
    </label>
  );
};

export default memo(RecipientsInput);
