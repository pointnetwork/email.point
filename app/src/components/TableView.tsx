import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { InboxIcon, BanIcon, CheckIcon, RefreshIcon } from '@heroicons/react/outline';

import * as ContractService from '@services/ContractService';

import { actions as uiActions } from '@store/modules/ui';
import { selectors as identitySelectors } from '@store/modules/identity';

import EmailMapper from '@mappers/Email';

import Spinner from '@components/Spinner';
import TableRow from '@components/TableRow';

type Props = {
  getTableItems: () => Promise<EmailInputData[]>;
  title?: String;
};

const TableView: React.FC<Props> = (props) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  const walletAddress = useSelector(identitySelectors.getWalletAddress);

  const dispatch = useDispatch();

  const { title, getTableItems } = props;

  const allChecked = emails.every(({ checked }) => checked);
  const someChecked = emails.some(({ checked }) => checked);

  async function onMarkAsImportantHandler(_email: Email) {
    await ContractService.sendContract({
      contract: 'PointEmail',
      method: 'markAsImportant',
      params: [_email.encryptedMessageId, !_email.important],
    });
    setEmails((emails) => {
      return emails.map((email) => {
        if (email.id === _email.id) {
          email.important = !email.important;
        }
        return email;
      });
    });
  }

  function onCheckHandler(_email: Email) {
    setEmails((emails) => {
      return emails.map((email) => {
        if (email.id === _email.id) {
          email.checked = !email.checked;
        }
        return email;
      });
    });
  }

  function checkAll() {
    setEmails((emails) => {
      return emails.map((email) => {
        email.checked = !allChecked;
        return email;
      });
    });
  }

  async function deleteMessages() {
    if (deleting) {
      return;
    }

    try {
      setDeleting(true);
      const deleteMessagesPromises: Promise<void>[] = [];
      emails.forEach((email) => {
        if (email.checked) {
          deleteMessagesPromises.push(
            ContractService.sendContract({
              contract: 'PointEmail',
              method: 'deleteMessage',
              params: [email.encryptedMessageId, !email.deleted],
            })
          );
        }
      });
      await Promise.all(deleteMessagesPromises);
      refreshTable();
      setDeleting(false);
    } catch (error) {
      console.error(error);
      setDeleting(false);
      refreshTable();
      dispatch(
        uiActions.showErrorNotification({
          message: 'Something went wrong.',
        })
      );
    }
  }

  function refreshTable() {
    setLoading(true);
    getTableItems()
      .then(async (_emails) => {
        const emails = await Promise.all(_emails.map(EmailMapper));
        emails.sort(
          ({ createdAt: ca1 }: { createdAt: number }, { createdAt: ca2 }: { createdAt: number }) =>
            ca2 - ca1
        );
        setLoading(false);
        setEmails(emails);
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

  useEffect(() => {
    if (!walletAddress) {
      return;
    }
    refreshTable();
  }, [walletAddress]);

  return (
    <>
      {loading ? (
        <div className="container w-full p-10 flex flex-col items-center">
          <Spinner className="w-8 h-8" />
          <p className="mt-2">Loading...</p>
        </div>
      ) : (
        <div className="container px-6 mx-auto grid">
          <h2 className="my-3 text-gray-700 dark:text-gray-200">
            <div className="text-2xl font-semibold">{title}</div>
            <div>{walletAddress}</div>
          </h2>
          <div className="w-full overflow-hidden rounded-lg shadow-xs">
            <div className="w-full overflow-x-auto">
              {!emails.length ? (
                <div className="w-full text-gray-500 whitespace-no-wrap p-10 text-center bg-white shadow-md dark:bg-gray-800 flex flex-col justify-center items-center">
                  <InboxIcon className="w-20 h-20 mb-2" />
                  <p>Folder is empty.</p>
                </div>
              ) : (
                <table className="table-auto w-full whitespace-no-wrap">
                  <thead>
                    <tr
                      className="
                      text-xs
                      font-semibold
                      tracking-wide
                      text-left
                      text-gray-500
                      uppercase
                      border-b
                      dark:border-gray-700
                      bg-gray-50
                      dark:text-gray-400
                      dark:bg-gray-800
                    "
                    >
                      <th className="px-4 py-2 flex w-32 flex-row items-center">
                        <button
                          onClick={checkAll}
                          className={`
                          border-2
                          rounded
                          w-6
                          h-6
                          border-gray-300
                          text-xs
                          text-gray-400
                          mr-2
                        `}
                        >
                          {allChecked ? (
                            <CheckIcon className="w-5 h-5" />
                          ) : (
                            <div className="w-5 h-5"></div>
                          )}
                        </button>
                        {someChecked && (
                          <button
                            className="text-xs m-2 text-gray-500"
                            onClick={deleteMessages}
                            disabled={!!loading}
                          >
                            <BanIcon className="w-5 h-5" />
                          </button>
                        )}
                        {deleting && <Spinner className="w-5 h-5" />}
                        <button
                          className="text-xs m-2 text-gray-500"
                          onClick={refreshTable}
                          disabled={!!loading}
                        >
                          <RefreshIcon className="w-5 h-5" />
                        </button>
                      </th>
                      <th className="px-4 py-3">From</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Message</th>
                      <th className="px-4 py-3"></th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y dark:divide-gray-700 dark:bg-gray-800">
                    {emails.map((email) => (
                      <TableRow
                        email={email}
                        onChecked={onCheckHandler}
                        onMarkAsImportant={onMarkAsImportantHandler}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TableView;
