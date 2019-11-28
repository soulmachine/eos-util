// import BigNumber from 'bignumber.js';
import { JsonRpc, Serialize, Numeric } from 'eosjs';
import { isValidPublic } from 'eosjs-ecc';

const fetch = require('node-fetch'); // node only; not needed in browsers
const { TextEncoder, TextDecoder } = require('util');

const EOS_API_ENDPOINTS = [
  'http://eos.infstones.io',
  'https://eos.infstones.io',
  'http://eos.eoscafeblock.com',
  'https://eos.eoscafeblock.com',
  'https://node.betdice.one',
  'http://api.main.alohaeos.com',
  'http://api-mainnet.starteos.io',
  'https://bp.whaleex.com',
  'https://api.zbeos.com',
  'https://node1.zbeos.com',
  'https://api.main.alohaeos.com',
  'https://api.eoslaomao.com',
  'https://api-mainnet.starteos.io',
  'http://peer2.eoshuobipool.com:8181',
  'http://peer1.eoshuobipool.com:8181',
  'https://api.redpacketeos.com',
  'https://mainnet.eoscannon.io',
];

function getRandomRpc() {
  const url = EOS_API_ENDPOINTS[Math.floor(Math.random() * EOS_API_ENDPOINTS.length)];
  return new JsonRpc(url, { fetch });
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

export function numericFromName(accountName: string): string {
  const sb = new Serialize.SerialBuffer({
    textEncoder: new TextEncoder(),
    textDecoder: new TextDecoder(),
  });

  sb.pushName(accountName);

  return Numeric.binaryToDecimal(sb.getUint8Array(8));
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
  const rpc = getRandomRpc();
  const response = await rpc.history_get_key_accounts(publicKey);
  return response.account_names as string[];
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
}
