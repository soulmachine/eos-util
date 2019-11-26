declare module 'eosjs-ecc' {
  function isValidPrivate(privateKey: string): boolean;
  function isValidPublic(publicKey: string): boolean;
}
