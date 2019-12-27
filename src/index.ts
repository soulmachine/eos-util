// import BigNumber from 'bignumber.js';
import { Api, JsonRpc, Serialize, Numeric, RpcError } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig'; // development only
import { isValidPublic } from 'eosjs-ecc';
import { getTokenInfo } from 'eos-token-info';
import { strict as assert } from 'assert';
import { FetchError } from 'node-fetch';

const fetch = require('node-fetch'); // node only; not needed in browsers
const { TextEncoder, TextDecoder } = require('util');

export const EOS_API_ENDPOINTS = [
  'http://eos.infstones.io',
  'https://eos.infstones.io',
  'http://eos.eoscafeblock.com',
  'https://eos.eoscafeblock.com',
  'http://api.main.alohaeos.com',
  'https://bp.whaleex.com',
  'https://api.zbeos.com',
  'https://node1.zbeos.com',
  'https://api.main.alohaeos.com',
  'http://peer2.eoshuobipool.com:8181',
  'http://peer1.eoshuobipool.com:8181',
  'https://api.redpacketeos.com',
  'https://mainnet.eoscannon.io',
];

export const EOS_API_BLACK_LIST = [
  'http://api-mainnet.starteos.io', // FetchError: invalid json
  'https://api-mainnet.starteos.io', // FetchError: invalid json
  'https://api.eoslaomao.com', // RpcError: Unknown Endpoint
  'https://node.betdice.one', // FetchError: invalid json
];

export const EOS_QUANTITY_PRECISION = 4;

export function getRandomRpc() {
  const url = EOS_API_ENDPOINTS[Math.floor(Math.random() * EOS_API_ENDPOINTS.length)];
  return new JsonRpc(url, { fetch });
}

export function getRandomApi(privateKey: string) {
  const rpc = getRandomRpc();
  const api = new Api({
    rpc,
    signatureProvider: new JsSignatureProvider([privateKey]),
    textDecoder: new TextDecoder(),
    textEncoder: new TextEncoder(),
  });
  return api;
}

/**
 * Set a customized API endpoint.
 *
 * Usually you don't need to call this API unless you want to use a different API endpoint instead of default ones.
 *
 * By default this library contains a list of seed API endpoints, if you want to use a different
 * API endpoint, call this function.
 *
 * @param apiEndpoint an API endpoint
 */
export function setApiEndpoint(apiEndpoint: string): void {
  if (apiEndpoint) {
    // clear EOS_API_ENDPOINTS and set apiEndpoint as its only one element
    EOS_API_ENDPOINTS.splice(0, EOS_API_ENDPOINTS.length, apiEndpoint);
  }
}

export async function sendTransaction(
  actions: Serialize.Action[],
  privateKey: string,
): Promise<any> {
  return getRandomApi(privateKey).transact(
    {
      actions,
    },
    {
      blocksBehind: 3,
      expireSeconds: 300,
    },
  );
}

function calcDecimals(quantity: string): number {
  if (!quantity.includes('.')) return 0;
  return quantity.split(' ')[0].split('.')[1].length;
}

/**
 * Create a transfer action.
 *
 * @param from The sender's EOS account
 * @param to The receiver's EOS account
 * @param symbol The currency symbol, e.g., EOS, USDT, EIDOS, DICE, KEY, etc.
 * @param quantity The quantity to send
 * @param memo memo
 */
export function createTransferAction(
  from: string,
  to: string,
  symbol: string,
  quantity: string,
  memo = '',
): Serialize.Action {
  const tokenInfo = getTokenInfo(symbol);
  assert.equal(
    calcDecimals(quantity),
    tokenInfo.decimals,
    `The decimals of quantity is NOT equal to ${tokenInfo.decimals}`,
  );

  const action: Serialize.Action = {
    account: tokenInfo.contract,
    name: 'transfer',
    authorization: [
      {
        actor: from,
        permission: 'active',
      },
    ],
    data: {
      from,
      to,
      quantity: `${quantity} ${symbol}`,
      memo,
    },
  };

  return action;
}

/**
 * Transfer EOS or EOS token to another account.
 *
 * @param from The sender's EOS account
 * @param privateKey The sender's EOS private key
 * @param to The receiver's EOS account
 * @param symbol The currency symbol, e.g., EOS, USDT, EIDOS, DICE, KEY, etc.
 * @param quantity The quantity to send
 * @param memo memo
 */
export async function transfer(
  from: string,
  privateKey: string,
  to: string,
  symbol: string,
  quantity: string,
  memo = '',
): Promise<any> {
  const action = createTransferAction(from, to, symbol, quantity, memo);

  return sendTransaction([action], privateKey);
}

export function numericFromName(accountName: string): string {
  const sb = new Serialize.SerialBuffer({
    textEncoder: new TextEncoder(),
    textDecoder: new TextDecoder(),
  });

  sb.pushName(accountName);

  return Numeric.binaryToDecimal(sb.getUint8Array(8));
}

export async function queryTransaction(txid: string, blockNum?: number): Promise<any> {
  const rpc = getRandomRpc();
  const response = await rpc.history_get_transaction(txid, blockNum); // eslint-disable-line no-await-in-loop
  if (response.transaction_id || response.id) {
    return response;
  }
  throw Error('Unknown response format');
}

export async function getCurrencyBalance(account: string, symbol: string): Promise<number> {
  const balanceInfo = await getRandomRpc().get_currency_balance(
    getTokenInfo(symbol).contract,
    account,
    symbol,
  );
  const balance = parseFloat(balanceInfo[0].split(' ')[0]);
  return balance;
}

/**
 * Check the existance of an account.
 *
 * @param accountName EOS account name
 * @return true if exists, otherwise false
 */
export async function accountExists(accountName: string): Promise<boolean> {
  const rpc = getRandomRpc();

  const { rows } = await rpc.get_table_rows({
    json: true,
    code: 'eosio',
    scope: accountName,
    table: 'userres',
    lower_bound: accountName,
    upper_bound: accountName,
  });

  return rows.length > 0;
}

/**
 * Get the account names of a public key.
 *
 * @param publicKey EOS public key
 * @returns an array of account names, empty if not exist
 */
export async function getKeyAccounts(publicKey: string): Promise<string[]> {
  if (!isValidPublic(publicKey)) {
    throw new Error(`Invalid public key: ${publicKey}`);
  }

  let error: Error | undefined;
  for (let i = 0; i < 3; i += 1) {
    try {
      const rpc = getRandomRpc();
      // eslint-disable-next-line no-await-in-loop
      const response = await rpc.history_get_key_accounts(publicKey);
      return response.account_names as string[];
    } catch (e) {
      if (e instanceof RpcError && e.message.includes('Unknown Endpoint')) {
        // continue
      } else if (e instanceof FetchError && e.message.includes('invalid json')) {
        // continue
      } else {
        throw e;
      }
    }
  }
  assert.ok(error);
  throw error;
}

export interface TableRows {
  rows: Array<{ [key: string]: any }>;
  more: boolean;
}

export async function getTableRows({
  code,
  scope,
  table,
  lower_bound = '',
  upper_bound = '',
  limit = 100,
}: {
  code: string;
  scope: string;
  table: string;
  lower_bound?: unknown;
  upper_bound?: unknown;
  limit?: number;
}): Promise<TableRows> {
  let error: Error | undefined;
  for (let i = 0; i < 3; i += 1) {
    try {
      const rpc = getRandomRpc();
      return rpc.get_table_rows({
        json: true,
        code,
        scope,
        table,
        lower_bound,
        upper_bound,
        limit,
      });
    } catch (e) {
      if (e instanceof RpcError && e.message.includes('Unknown Endpoint')) {
        // continue
      } else if (e instanceof FetchError && e.message.includes('invalid json')) {
        // continue
      } else {
        throw e;
      }
    }
  }
  assert.ok(error);
  throw error;
}
