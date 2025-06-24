import { NextRequest, NextResponse } from 'next/server';
import { Agent } from 'alith';

// Function to detect token balance requests
function isTokenBalanceRequest(message: string): { isRequest: boolean; contractAddress?: string; walletAddress?: string } {
  const lowerMessage = message.toLowerCase();
  
  // Check for common patterns
  const balancePatterns = [
    /check.*balance/i,
    /token.*balance/i,
    /balance.*check/i,
    /how much.*token/i,
    /token.*amount/i
  ];
  
  const hasBalanceIntent = balancePatterns.some(pattern => pattern.test(lowerMessage));
  
  if (!hasBalanceIntent) {
    return { isRequest: false };
  }
  
  // Extract Ethereum addresses (basic pattern)
  const addressPattern = /0x[a-fA-F0-9]{40}/g;
  const addresses = message.match(addressPattern);
  
  if (!addresses || addresses.length < 2) {
    return { isRequest: false };
  }
  
  // Assume first address is contract, second is wallet
  // In a real implementation, you might want more sophisticated parsing
  return {
    isRequest: true,
    contractAddress: addresses[0],
    walletAddress: addresses[1]
  };
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Check if this is a token balance request
    const balanceRequest = isTokenBalanceRequest(message);
    
    if (balanceRequest.isRequest && balanceRequest.contractAddress && balanceRequest.walletAddress) {
      // Route to token balance API
      try {
        const balanceResponse = await fetch(`${request.nextUrl.origin}/api/token-balance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contractAddress: balanceRequest.contractAddress,
            walletAddress: balanceRequest.walletAddress
          }),
        });

        const balanceData = await balanceResponse.json();
        
        if (balanceData.success) {
          const formattedResponse = `🔍 **Token Balance Check Results**

**Token Information:**
• Name: ${balanceData.data.tokenName}
• Symbol: ${balanceData.data.tokenSymbol}
• Contract: \`${balanceData.data.contractAddress}\`

**Wallet Information:**
• Address: \`${balanceData.data.walletAddress}\`
• Token Balance: **${balanceData.data.balance} ${balanceData.data.tokenSymbol}**
• LAZAI Balance: **${balanceData.data.lazaiBalance} LAZAI**

**Network:** ${balanceData.data.network.name} (Chain ID: ${balanceData.data.network.chainId})

You can view this transaction on the [block explorer](${balanceData.data.network.explorer}/address/${balanceData.data.walletAddress}).`;
          
          return NextResponse.json({ response: formattedResponse });
        } else {
          let errorMessage = `❌ **Error checking token balance:** ${balanceData.error}`;
          
          // Provide helpful suggestions based on the error
          if (balanceData.error.includes('not a valid ERC-20 token')) {
            errorMessage += `\n\n💡 **Suggestions:**
• Make sure the contract address is a valid ERC-20 token on LazAI testnet
• Verify the contract exists and is deployed on the network
• Check if the contract implements the standard ERC-20 interface`;
          } else if (balanceData.error.includes('Invalid contract address')) {
            errorMessage += `\n\n💡 **Suggestion:** Please provide a valid Ethereum address starting with 0x followed by 40 hexadecimal characters.`;
          } else if (balanceData.error.includes('Invalid wallet address')) {
            errorMessage += `\n\n💡 **Suggestion:** Please provide a valid Ethereum wallet address starting with 0x followed by 40 hexadecimal characters.`;
          }
          
          return NextResponse.json({ response: errorMessage });
        }
      } catch (error) {
        console.error('Error calling token balance API:', error);
        return NextResponse.json({ 
          response: "❌ **Error:** Failed to check token balance. Please try again later.\n\n💡 **Possible causes:**\n• Network connection issues\n• Invalid contract or wallet addresses\n• Contract not deployed on LazAI testnet" 
        });
      }
    }

    // Check if API key is configured for AI responses
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    // Initialize the Alith agent with enhanced preamble
    const agent = new Agent({
      model: "gpt-4",
      preamble: `Your name is Alith. You are a helpful AI assistant with blockchain capabilities. 

**Available Features:**
1. **Token Balance Checker**: Users can check ERC-20 token balances on the LazAI testnet by providing a contract address and wallet address. The format should include both addresses in the message.

**Network Information:**
- Network: LazAI Testnet
- Chain ID: 133718
- RPC: https://lazai-testnet.metisdevops.link
- Explorer: https://lazai-testnet-explorer.metisdevops.link

**How to use token balance checker:**
Users can ask questions like:
- "Check token balance for contract 0x... and wallet 0x..."
- "What's the balance of token 0x... in wallet 0x..."
- "Check balance: contract 0x... wallet 0x..."

Provide clear, concise, and accurate responses. Be friendly and engaging in your conversations. If users ask about token balances, guide them to provide both contract and wallet addresses.`,
    });

    // Get response from the agent
    const response = await agent.prompt(message);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to get response from AI' },
      { status: 500 }
    );
  }
} 