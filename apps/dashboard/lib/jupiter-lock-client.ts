import { 
  PublicKey, 
  SystemProgram, 
  Transaction,
  Connection,
  Keypair,
  TransactionInstruction
} from '@solana/web3.js'
import { 
  getAssociatedTokenAddressSync, 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction
} from '@solana/spl-token'
import { Buffer } from 'buffer'
import BN from 'bn.js'

export const JUP_LOCK_PROGRAM_ID = new PublicKey('LocpQgucEQHbqNABEYvBvwoxCPsSbG91A1QaQhQQqjn')

export const BUNKER_MINT = new PublicKey('8NCievmJCg2d9Vc2TWgz2HkE6ANeSX7kwvdq5AL7pump')

export const ESCROW_PDA_SEED = "escrow"
export const ESCROW_METADATA_PDA_SEED = "escrow_metadata"
export const EVENT_AUTHORITY_PDA_SEED = "__event_authority"

export type DurationCode = '1M' | '3M' | '6M' | '12M'

export interface CreateStakeParams {
  connection: Connection
  wallet: PublicKey
  signTransaction: (tx: Transaction) => Promise<Transaction>
  amountBunker: number
  duration: DurationCode
  title: string
}

export interface CreateStakeTxResult {
  transaction: Transaction
  ephemeralKeypair: Keypair
}

const SECONDS = {
  DAY: 86400,
  MONTH_30: 30 * 86400,
  QUARTER_90: 90 * 86400,
  YEAR_365: 365 * 86400,
}

const BUNKER_DECIMALS = 6

function buildOnchainSchedule(duration: DurationCode) {
  switch (duration) {
    case '1M':
      return { 
        frequency: SECONDS.MONTH_30, 
        numberOfPeriod: 1, 
        cliffSeconds: 0 
      }
    case '3M':
      return { 
        frequency: SECONDS.QUARTER_90, 
        numberOfPeriod: 1, 
        cliffSeconds: 0 
      }
    case '6M':
      return { 
        frequency: SECONDS.MONTH_30 * 6,
        numberOfPeriod: 1,
        cliffSeconds: 0
      }
    case '12M':
      return { 
        frequency: SECONDS.YEAR_365, 
        numberOfPeriod: 1, 
        cliffSeconds: 0 
      }
  }
}

enum CancelMode {
  None = 0,
  Receiver = 1,
  Creator = 2,
  Both = 3
}

enum UpdateRecipientMode {
  None = 0,
  Receiver = 1,
  Creator = 2,
  Both = 3
}

function parseUnits(amount: string, decimals: number): BN {
  const parts = amount.split('.')
  const wholePart = parts[0] || '0'
  const fractionalPart = parts[1] || ''
  
  const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals)
  
  const combined = wholePart + paddedFractional
  
  return new BN(combined)
}

const CREATE_VESTING_ESCROW_V2_DISCRIMINATOR = Buffer.from([181, 155, 104, 183, 182, 128, 35, 47])
const CREATE_VESTING_ESCROW_METADATA_DISCRIMINATOR = Buffer.from([93, 78, 33, 103, 173, 125, 70, 0])

function encodeU64(value: BN): Buffer {
  const buffer = Buffer.alloc(8)
  buffer.writeBigUInt64LE(BigInt(value.toString()))
  return buffer
}

function encodeU32(value: number): Buffer {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32LE(value)
  return buffer
}

function encodeString(str: string): Buffer {
  const strBuffer = Buffer.from(str, 'utf8')
  const lengthBuffer = encodeU32(strBuffer.length)
  return Buffer.concat([lengthBuffer, strBuffer])
}

function createVestingEscrowV2Instruction(params: {
  base: PublicKey
  escrow: PublicKey
  tokenMint: PublicKey
  escrowToken: PublicKey
  sender: PublicKey
  senderToken: PublicKey
  recipient: PublicKey
  vestingStartTime: BN
  cliffTime: BN
  frequency: number
  cliffUnlockAmount: BN
  amountPerPeriod: BN
  numberOfPeriod: number
  updateRecipientMode: number
  cancelMode: number
  eventAuthority: PublicKey
  tokenProgram: PublicKey
}): TransactionInstruction {
  const keys = [
    { pubkey: params.base, isSigner: true, isWritable: true },
    { pubkey: params.escrow, isSigner: false, isWritable: true },
    { pubkey: params.tokenMint, isSigner: false, isWritable: false },
    { pubkey: params.escrowToken, isSigner: false, isWritable: true },
    { pubkey: params.sender, isSigner: true, isWritable: true },
    { pubkey: params.senderToken, isSigner: false, isWritable: true },
    { pubkey: params.recipient, isSigner: false, isWritable: false },
    { pubkey: params.tokenProgram, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: params.eventAuthority, isSigner: false, isWritable: false },
    { pubkey: JUP_LOCK_PROGRAM_ID, isSigner: false, isWritable: false },
  ]

  const data = Buffer.concat([
    CREATE_VESTING_ESCROW_V2_DISCRIMINATOR,
    encodeU64(params.vestingStartTime),
    encodeU64(params.cliffTime),
    encodeU64(new BN(params.frequency)),
    encodeU64(params.cliffUnlockAmount),
    encodeU64(params.amountPerPeriod),
    encodeU64(new BN(params.numberOfPeriod)),
    Buffer.from([params.updateRecipientMode]),
    Buffer.from([params.cancelMode]),
    Buffer.from([0])
  ])

  return new TransactionInstruction({
    keys,
    programId: JUP_LOCK_PROGRAM_ID,
    data,
  })
}

function createVestingEscrowMetadataInstruction(params: {
  escrow: PublicKey
  creator: PublicKey
  escrowMetadata: PublicKey
  payer: PublicKey
  name: string
  description: string
  creatorEmail: string
  recipientEmail: string
}): TransactionInstruction {
  const keys = [
    { pubkey: params.escrow, isSigner: false, isWritable: true },
    { pubkey: params.creator, isSigner: true, isWritable: false },
    { pubkey: params.escrowMetadata, isSigner: false, isWritable: true },
    { pubkey: params.payer, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  const data = Buffer.concat([
    CREATE_VESTING_ESCROW_METADATA_DISCRIMINATOR,
    encodeString(params.name),
    encodeString(params.description),
    encodeString(params.creatorEmail),
    encodeString(params.recipientEmail),
  ])

  return new TransactionInstruction({
    keys,
    programId: JUP_LOCK_PROGRAM_ID,
    data,
  })
}

export async function createStakeTx(params: CreateStakeParams): Promise<CreateStakeTxResult> {
  const { connection, wallet, amountBunker, duration, title } = params
  const recipient = wallet

  const transaction = new Transaction()
  
  const ephemeralKeypair = Keypair.generate()
  
  const [escrow] = PublicKey.findProgramAddressSync(
    [Buffer.from(ESCROW_PDA_SEED), ephemeralKeypair.publicKey.toBuffer()],
    JUP_LOCK_PROGRAM_ID
  )
  
  const [eventAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from(EVENT_AUTHORITY_PDA_SEED)],
    JUP_LOCK_PROGRAM_ID
  )
  
  const [escrowMetadata] = PublicKey.findProgramAddressSync(
    [Buffer.from(ESCROW_METADATA_PDA_SEED), escrow.toBuffer()],
    JUP_LOCK_PROGRAM_ID
  )

  const tokenProgram = TOKEN_PROGRAM_ID
  const mint = BUNKER_MINT

  const userAta = getAssociatedTokenAddressSync(
    mint, 
    wallet, 
    false,
    tokenProgram
  )
  
  const escrowAta = getAssociatedTokenAddressSync(
    mint, 
    escrow, 
    true, // allowOwnerOffCurve = true (IMPORTANT: for PDA owners)
    tokenProgram
  )

  transaction.add(
    createAssociatedTokenAccountIdempotentInstruction(
      wallet, // payer
      userAta, // ata
      wallet, // owner
      mint, // mint
      tokenProgram
    )
  )

  transaction.add(
    createAssociatedTokenAccountIdempotentInstruction(
      wallet, // payer
      escrowAta, // ata
      escrow, // owner (PDA)
      mint, // mint
      tokenProgram
    )
  )

  const schedule = buildOnchainSchedule(duration)
  const startTime = new BN(Math.floor(Date.now() / 1000) + 300)
  const cliffTime = startTime.add(new BN(schedule.cliffSeconds))
  
  const totalAmount = parseUnits(amountBunker.toString(), BUNKER_DECIMALS)
  
  const cliffAmount = new BN(0)
  
  const vestingPeriodSeconds = schedule.frequency * schedule.numberOfPeriod - schedule.cliffSeconds
  const lockAmount = totalAmount.sub(cliffAmount)
  

  let amountPerPeriod: BN
  if (schedule.numberOfPeriod === 1) {
    amountPerPeriod = lockAmount
  } else {
    if (vestingPeriodSeconds > 0) {
      const amountPerSecond = lockAmount.div(new BN(vestingPeriodSeconds))
      amountPerPeriod = amountPerSecond.mul(new BN(schedule.frequency))
    } else {
      amountPerPeriod = lockAmount
    }
  }

  transaction.add(
    createVestingEscrowV2Instruction({
      base: ephemeralKeypair.publicKey,
      escrow,
      tokenMint: mint,
      escrowToken: escrowAta,
      sender: wallet,
      senderToken: userAta,
      recipient,
      vestingStartTime: startTime,
      cliffTime,
      frequency: schedule.frequency,
      cliffUnlockAmount: cliffAmount,
      amountPerPeriod,
      numberOfPeriod: schedule.numberOfPeriod,
      updateRecipientMode: UpdateRecipientMode.None, 
      cancelMode: CancelMode.None,
      eventAuthority,
      tokenProgram,
    })
  )

  transaction.add(
    createVestingEscrowMetadataInstruction({
      escrow,
      creator: wallet,
      escrowMetadata,
      payer: wallet,
      name: title,
      description: `${title} lock for ${amountBunker} BUNKER`,
      creatorEmail: '',
      recipientEmail: '',
    })
  )

  transaction.feePayer = wallet
  
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  transaction.recentBlockhash = blockhash
  

  
  return {
    transaction,
    ephemeralKeypair
  }
}