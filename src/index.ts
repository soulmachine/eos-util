// import BigNumber from 'bignumber.js';
import { strict as assert } from 'assert';
import { getTokenInfo } from 'eos-token-info';
import { Api, JsonRpc, Numeric, Serialize } from 'eosjs';
import { isValidPublic } from 'eosjs-ecc';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig'; // development only

const fetch = require('node-fetch'); // node only; not needed in browsers
const { TextEncoder, TextDecoder } = require('util');

export const EOS_API_ENDPOINTS = [
  'http://api.eossweden.org',
  'http://api.main.alohaeos.com',
  'http://bp.whaleex.com',
  'http://eos.greymass.com',
  'http://eos.infstones.io',
  'http://eos.unlimitedeos.com:7777',
  'http://peer1.eoshuobipool.com:8181',
  'http://peer2.eoshuobipool.com:8181',
  'https://bp.whaleex.com',
  'https://eos.greymass.com',
];

export const EOS_API_ENDPOINTS_BLACK_LIST = [
  'https://eos.eoscafeblock.com', // Unexpected token < in JSON
  'https://node1.zbeos.com', // Unexpected token < in JSON
];

export const EOS_QUANTITY_PRECISION = 4;

export function getRandomRpc(apiEndpoint?: string) {
  const url =
    apiEndpoint || EOS_API_ENDPOINTS[Math.floor(Math.random() * EOS_API_ENDPOINTS.length)];
  return new JsonRpc(url, { fetch });
}

export function getRandomApi(privateKey: string, apiEndpoint?: string) {
  const rpc = getRandomRpc(apiEndpoint);
  const api = new Api({
    rpc,
    signatureProvider: new JsSignatureProvider([privateKey]),
    textDecoder: new TextDecoder(),
    textEncoder: new TextEncoder(),
  });
  return api;
}

export async function sendTransaction(
  actions: Serialize.Action[],
  privateKey: string,
  apiEndpoint?: string,
): Promise<any> {
  return getRandomApi(privateKey, apiEndpoint).transact(
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

export async function queryTransaction(
  txid: string,
  blockNum?: number,
  apiEndpoint?: string,
): Promise<any> {
  const rpc = getRandomRpc(apiEndpoint);
  const response = await rpc.history_get_transaction(txid, blockNum);
  if (response.transaction_id || response.id) {
    return response;
  }
  throw Error('Unknown response format');
}

export async function getCurrencyBalance(
  account: string,
  symbol: string,
  apiEndpoint?: string,
): Promise<number> {
  const balanceInfo = await getRandomRpc(apiEndpoint).get_currency_balance(
    getTokenInfo(symbol).contract,
    account,
    symbol,
  );
  if (balanceInfo.length === 0) {
    return 0;
  }
  const balance = parseFloat(balanceInfo[0].split(' ')[0]);
  return balance;
}

/**
 * Check the existance of an account.
 *
 * @param accountName EOS account name
 * @return true if exists, otherwise false
 */
export async function accountExists(accountName: string, apiEndpoint?: string): Promise<boolean> {
  const rpc = getRandomRpc(apiEndpoint);

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
export async function getKeyAccounts(publicKey: string, apiEndpoint?: string): Promise<string[]> {
  if (!isValidPublic(publicKey)) {
    throw new Error(`Invalid public key: ${publicKey}`);
  }

  const rpc = getRandomRpc(apiEndpoint);
  const response = await rpc.history_get_key_accounts(publicKey);
  return response.account_names as string[];
}

export interface TableRows {
  rows: Array<{ [key: string]: any }>;
  more: boolean;
}

export async function getTableRows(
  {
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
  },
  apiEndpoint?: string,
): Promise<TableRows> {
  const rpc = getRandomRpc(apiEndpoint);
  return rpc.get_table_rows({
    json: true,
    code,
    scope,
    table,
    lower_bound,
    upper_bound,
    limit,
  });
}

export async function getCurrencyStats(
  contract: string,
  symbol: string,
  apiEndpoint?: string,
): Promise<{ supply: string; max_supply: string; issuer: string }> {
  const rpc = getRandomRpc(apiEndpoint);
  const stats = await rpc.get_currency_stats(contract, symbol);
  return stats[symbol];
}
