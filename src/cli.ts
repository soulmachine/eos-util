#!/usr/bin/env node
/* eslint-disable no-console,no-await-in-loop */
import { RpcError } from 'eosjs';
import { FetchError } from 'node-fetch';
import {
  accountExists,
  EOS_API_ENDPOINTS,
  getCurrencyBalance,
  getCurrencyStats,
  getKeyAccounts,
  getTableRows,
  numericFromName,
} from './index';

async function checkApiEndpoint(url: string): Promise<boolean> {
  try {
    await getTableRows(
      {
        code: 'newdexpublic',
        scope: 'newdexpublic',
        table: 'globalconfig',
      },
      url,
    );

    await accountExists('cryptoforest', url);

    await getCurrencyBalance('cryptoforest', 'EOS', url);

    await getKeyAccounts('EOS6zQQQXEgT9jmy9NHahAXqTRV4LaeCUwsE8XP8MP557Kn6s3KxP', url);

    await getKeyAccounts('EOS71uwakr9eo8NMARvtaeA5mfccyWtJyXHCeiSzsrbdhnn5DJXu3', url);
    return true;
  } catch (e) {
    console.error(
      `${url}:\n RpcError: ${e instanceof RpcError}, FetchError: ${e instanceof FetchError} \n ${
        e.message
      }`,
    );
    return false;
  }
}

(async () => {
  console.info(numericFromName('cryptoforest'));

  console.info(await getCurrencyStats('eosiopowcoin', 'POW'));

  const requests = EOS_API_ENDPOINTS.map(x => checkApiEndpoint(x));
  const success = await Promise.all(requests);

  const result: string[] = [];
  for (let i = 0; i < EOS_API_ENDPOINTS.length; i += 1) {
    if (success[i]) result.push(EOS_API_ENDPOINTS[i]);
  }
  console.info(result);
})();
