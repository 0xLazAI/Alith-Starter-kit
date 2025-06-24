import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// ERC-20 Token ABI (minimal for balance checking)
const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  }
];

// LazAI Testnet configuration
const LAZAI_RPC = 'https://lazai-testnet.metisdevops.link';
const LAZAI_CHAIN_ID = 133718;

export async function POST(request: NextRequest) {
  try {
    const { contractAddress, walletAddress } = await request.json();

    // Validate inputs
    if (!contractAddress || !walletAddress) {
      return NextResponse.json(
        { error: 'Contract address and wallet address are required' },
        { status: 400 }
      );
    }

    // Validate Ethereum addresses
    if (!ethers.isAddress(contractAddress)) {
      return NextResponse.json(
        { error: 'Invalid contract address format' },
        { status: 400 }
      );
    }

    if (!ethers.isAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Connect to LazAI testnet
    const provider = new ethers.JsonRpcProvider(LAZAI_RPC);
    
    // Create contract instance
    const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);

    try {
      // Get token information with individual error handling
      let balance, decimals, symbol, name;
      
      try {
        balance = await contract.balanceOf(walletAddress);
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to get token balance. Contract might not be a valid ERC-20 token.' },
          { status: 400 }
        );
      }

      try {
        decimals = await contract.decimals();
      } catch (error) {
        // If decimals call fails, assume 18 decimals (most common)
        decimals = 18;
      }

      try {
        symbol = await contract.symbol();
      } catch (error) {
        symbol = 'UNKNOWN';
      }

      try {
        name = await contract.name();
      } catch (error) {
        name = 'Unknown Token';
      }

      // Format balance - convert BigInt to string first
      const formattedBalance = ethers.formatUnits(balance.toString(), decimals);

      // Get LAZAI balance for comparison
      const lazaiBalance = await provider.getBalance(walletAddress);
      const formattedLazaiBalance = ethers.formatEther(lazaiBalance.toString());

      return NextResponse.json({
        success: true,
        data: {
          tokenName: name,
          tokenSymbol: symbol,
          contractAddress: contractAddress,
          walletAddress: walletAddress,
          balance: formattedBalance,
          rawBalance: balance.toString(), // Convert BigInt to string
          decimals: Number(decimals), // Convert BigInt to number
          lazaiBalance: formattedLazaiBalance,
          network: {
            name: 'LazAI Testnet',
            chainId: LAZAI_CHAIN_ID,
            rpc: LAZAI_RPC,
            explorer: 'https://lazai-testnet-explorer.metisdevops.link'
          }
        }
      });

    } catch (contractError) {
      console.error('Contract interaction error:', contractError);
      return NextResponse.json(
        { error: 'Contract not found or not a valid ERC-20 token on LazAI testnet' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error checking token balance:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('execution reverted')) {
        return NextResponse.json(
          { error: 'Contract not found or not a valid ERC-20 token' },
          { status: 400 }
        );
      }
      if (error.message.includes('network') || error.message.includes('connection')) {
        return NextResponse.json(
          { error: 'Network connection failed. Please try again.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to check token balance' },
      { status: 500 }
    );
  }
} 