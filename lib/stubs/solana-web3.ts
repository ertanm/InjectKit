/**
 * Stub for @solana/web3.js - we do not use Solana/wallet functionality.
 * Clerk pulls in @solana/wallet-adapter-react which requires this module.
 */

const noop = class {
  constructor(..._args: unknown[]) {}
}

export const Connection = noop
export const PublicKey = noop
export const Transaction = noop
export const VersionedTransaction = noop
export const VersionedMessage = noop
export type Cluster = "mainnet-beta" | "devnet" | "testnet"
export type ConnectionConfig = object
export type TransactionSignature = string
export type SendOptions = object
export type Signer = object
export type TransactionVersion = number

export default {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  VersionedMessage,
}
