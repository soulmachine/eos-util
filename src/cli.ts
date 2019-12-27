#!/usr/bin/env node
/* eslint-disable no-console,no-await-in-loop */
import { RpcError } from 'eosjs';
import { FetchError } from 'node-fetch';
import {
  accountExists,
  getKeyAccounts,
  numericFromName,
  EOS_API_ENDPOINTS,
  EOS_API_BLACK_LIST,
  getTableRows,
  setApiEndpoint,
} from './index';

async function checkApiEndpoint(url: string): Promise<boolean> {
  try {
    setApiEndpoint(url);

    await getTableRows({
      code: 'newdexpublic',
      scope: 'newdexpublic',
      table: 'globalconfig',
    });

    await accountExists('cryptoforest');

    await getKeyAccounts('EOS6zQQQXEgT9jmy9NHahAXqTRV4LaeCUwsE8XP8MP557Kn6s3KxP');

    await getKeyAccounts('EOS71uwakr9eo8NMARvtaeA5mfccyWtJyXHCeiSzsrbdhnn5DJXu3');
    return true;
  } catch (e) {
    console.error(`RpcError: ${e instanceof RpcError}, FetchError: ${e instanceof FetchError}`);
    console.dir(e.message);
    console.error(url);
    return false;
  }
}

(async () => {
  console.info(numericFromName('cryptoforest'));

  const apiEndpoints = [...EOS_API_ENDPOINTS]; // copy
  for (let i = 0; i < apiEndpoints.length; i += 1) {
    await checkApiEndpoint(apiEndpoints[i]);
  }

  const badApiEndpoints = [...EOS_API_BLACK_LIST]; // copy
  for (let i = 0; i < badApiEndpoints.length; i += 1) {
    await checkApiEndpoint(badApiEndpoints[i]);
  }
})();
