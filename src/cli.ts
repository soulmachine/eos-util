#!/usr/bin/env node
/* eslint-disable no-console */
import { accountExists, getKeyAccounts, numericFromName } from './index';

(async () => {
  console.info(numericFromName('cryptoforest'));

  const result = await accountExists('cryptoforest');
  console.info(result);

  const result1 = await getKeyAccounts('EOS6zQQQXEgT9jmy9NHahAXqTRV4LaeCUwsE8XP8MP557Kn6s3KxP');
  console.info(result1);

  const result2 = await getKeyAccounts('EOS71uwakr9eo8NMARvtaeA5mfccyWtJyXHCeiSzsrbdhnn5DJXu3');
  console.info(result2);
})();
