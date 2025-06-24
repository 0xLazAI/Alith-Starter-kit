# 🚀 Complete Step-by-Step Tutorial: AI Chatbot with Blockchain Capabilities

This comprehensive tutorial will guide you through building an AI chatbot that can handle both general conversations and blockchain operations, specifically token balance checking on the LazAI testnet.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Dependencies Installation](#dependencies-installation)
4. [Next.js Configuration](#nextjs-configuration)
5. [Token Balance API](#token-balance-api)
6. [Smart Chat API](#smart-chat-api)
7. [Chat Interface Component](#chat-interface-component)
8. [Environment Setup](#environment-setup)
9. [Testing](#testing)
10. [Customization](#customization)
11. [Troubleshooting](#troubleshooting)
12. [Deployment](#deployment)

---

## 🎯 Prerequisites

Before starting, ensure you have:

- **Node.js 18+** installed
- **npm or yarn** package manager
- **Basic knowledge** of React, TypeScript, and Next.js
- **OpenAI API key** (for AI conversations)
- **Code editor** (VS Code recommended)

---

## 🏗️ Project Setup

### Step 1: Create Next.js Project

```bash
# Create a new Next.js project with TypeScript
npx create-next-app@latest ai-agent --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"

# Navigate to the project directory
cd ai-agent
```

### Step 2: Verify Project Structure

Your project should look like this:
```
ai-blockchain-chatbot/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── public/
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 📦 Dependencies Installation

### Step 3: Install Required Packages

```bash
# Install core dependencies
npm install ethers alith

# Install development dependencies
npm install --save-dev node-loader
```

**What each package does:**
- `ethers`: Ethereum library for blockchain interactions
- `alith`: AI SDK for OpenAI integration
- `node-loader`: Webpack loader for native modules

---

## ⚙️ Next.js Configuration

### Step 4: Configure next.config.ts

Create or update `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // On the server side, handle native modules
      config.externals = config.externals || [];
      config.externals.push({
        '@lazai-labs/alith-darwin-arm64': 'commonjs @lazai-labs/alith-darwin-arm64',
      });
    } else {
      // On the client side, don't bundle native modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@lazai-labs/alith-darwin-arm64': false,
        'alith': false,
      };
    }

    return config;
  },
  // Mark packages as external for server components
  serverExternalPackages: ['@lazai-labs/alith-darwin-arm64', 'alith'],
};

export default nextConfig;
```

**Why this configuration is needed:**
- Handles native modules that can't be bundled by webpack
- Prevents client-side bundling of server-only packages
- Ensures proper module resolution

---

## 🔗 Token Balance API

### Step 5: Create API Directory Structure

```bash
# Create the API directories
mkdir -p app/api/token-balance
mkdir -p app/api/chat
mkdir -p app/components
```

### Step 6: Create Token Balance API

Create `app/api/token-balance/route.ts`:

```typescript
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
```

**Key Features:**
- Validates Ethereum addresses
- Handles BigInt serialization
- Provides fallback values for missing token data
- Comprehensive error handling
- Returns both token and native currency balances

---

## 🤖 Smart Chat API

### Step 7: Create Smart Chat API

Create `app/api/chat/route.ts`:

```typescript
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
```

**Key Features:**
- Smart message routing based on content analysis
- Pattern recognition for balance requests
- Automatic address extraction
- Enhanced AI prompts with blockchain context
- Comprehensive error handling

---

## 🎨 Chat Interface Component

### Step 8: Create Chat Interface

Create `app/components/ChatInterface.tsx`:

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

// Simple markdown renderer for basic formatting
const renderMarkdown = (text: string) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
    .replace(/\n/g, '<br>')
    .replace(/•/g, '•');
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputMessage.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting response:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Alith AI Assistant</h1>
        <p className="text-sm text-gray-600">Powered by Alith SDK & ChatGPT • Blockchain Capabilities</p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-lg font-medium mb-2">Welcome to Alith AI!</h3>
            <p className="text-sm mb-4">I can help you with general questions and blockchain operations.</p>
            
            {/* Feature showcase */}
            <div className="bg-white rounded-lg p-4 max-w-md mx-auto border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Available Features:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 💬 General AI conversations</li>
                <li>• 🔍 Token balance checking on LazAI testnet</li>
                <li>• 📊 Blockchain data queries</li>
              </ul>
              <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                <strong>Example:</strong> "Check token balance for contract 0x1234... and wallet 0x5678..."
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}
            >
              <div 
                className={`text-sm whitespace-pre-wrap ${
                  message.role === 'assistant' ? 'prose prose-sm max-w-none' : ''
                }`}
                dangerouslySetInnerHTML={{
                  __html: message.role === 'assistant' 
                    ? renderMarkdown(message.content)
                    : message.content
                }}
              />
              <div
                className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-600">Alith is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Container */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex space-x-4">
          <div className="flex-1">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything or check token balances..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
        
        {/* Quick help */}
        <div className="mt-2 text-xs text-gray-500">
          💡 <strong>Tip:</strong> Include both contract and wallet addresses to check token balances on LazAI testnet
        </div>
      </div>
    </div>
  );
}
```

**Key Features:**
- Real-time message updates
- Markdown rendering for formatted responses
- Auto-scroll to latest messages
- Loading indicators
- Responsive design
- Feature showcase for new users

---

## 🔧 Environment Setup

### Step 9: Configure Environment Variables

Create a `.env.local` file in your project root:

```env
# OpenAI API Key for AI conversations
OPENAI_API_KEY=your_openai_api_key_here
```

### Step 10: Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to "API Keys" in the sidebar
4. Click "Create new secret key"
5. Copy the generated key
6. Paste it in your `.env.local` file

**Security Note:** Never commit your API key to version control!

---

## 🧪 Testing

### Step 11: Start Development Server

```bash
npm run dev
```

### Step 12: Test General Chat

Try these general questions:
- "What is blockchain technology?"
- "How does cryptocurrency work?"
- "Tell me a joke"
- "What are the benefits of decentralized systems?"

### Step 13: Test Token Balance Checking

Try these formats:
- "Check token balance for contract 0x1234567890123456789012345678901234567890 and wallet 0x0987654321098765432109876543210987654321"
- "What's the balance of token 0x... in wallet 0x..."
- "Check balance: contract 0x... wallet 0x..."

**Note:** You'll need valid contract and wallet addresses on the LazAI testnet for this to work.

---

## 🔧 Customization

### Step 14: Change Network Configuration

To use a different blockchain network, update the constants in `app/api/token-balance/route.ts`:

```typescript
// Example: Ethereum Mainnet
const NETWORK_RPC = 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID';
const NETWORK_CHAIN_ID = 1;
const NETWORK_NAME = 'Ethereum Mainnet';
const NETWORK_EXPLORER = 'https://etherscan.io';

// Example: Polygon
const NETWORK_RPC = 'https://polygon-rpc.com';
const NETWORK_CHAIN_ID = 137;
const NETWORK_NAME = 'Polygon';
const NETWORK_EXPLORER = 'https://polygonscan.com';
```

### Step 15: Add More Features

You can extend the chatbot with:

**Transaction History:**
```typescript
// Add to token-balance API
const transactions = await provider.getHistory(walletAddress);
```

**NFT Balance Checking:**
```typescript
// Add ERC-721 ABI and balance checking
const ERC721_ABI = [
  {
    "constant": true,
    "inputs": [{"name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "type": "function"
  }
];
```

**Gas Price Estimation:**
```typescript
// Add to API
const gasPrice = await provider.getFeeData();
```

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### 1. Native Module Errors
**Problem:** `Module parse failed: Unexpected character ''`
**Solution:** Ensure your `next.config.ts` is properly configured with the webpack settings.

#### 2. BigInt Serialization Errors
**Problem:** `Do not know how to serialize a BigInt`
**Solution:** Always convert BigInt values to strings before sending in JSON responses.

#### 3. Invalid Contract Errors
**Problem:** `Contract not found or not a valid ERC-20 token`
**Solution:** 
- Verify the contract address is correct
- Ensure the contract is deployed on the target network
- Check if the contract implements the ERC-20 standard

#### 4. Network Connection Issues
**Problem:** `Network connection failed`
**Solution:**
- Check your internet connection
- Verify the RPC URL is correct and accessible
- Try using a different RPC endpoint

#### 5. OpenAI API Errors
**Problem:** `OpenAI API key is not configured`
**Solution:**
- Make sure you have a valid OpenAI API key
- Check that the key is properly set in `.env.local`
- Restart the development server after adding the key

#### 6. Port Already in Use
**Problem:** `Port 3000 is in use`
**Solution:**
- Use a different port: `npm run dev -- -p 3001`
- Or kill the process using port 3000

---

## 🚀 Deployment

### Step 16: Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Step 17: Deploy to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard:
   - Go to your project settings
   - Add `OPENAI_API_KEY` environment variable

### Step 18: Deploy to Other Platforms

**Netlify:**
```bash
npm run build
# Upload the .next folder to Netlify
```

**Railway:**
```bash
# Connect your GitHub repository
# Railway will automatically detect Next.js and deploy
```

---

## 📚 Additional Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Alith SDK Documentation](https://docs.alith.ai/)
- [OpenAI API Documentation](https://platform.openai.com/docs)

### Useful Tools
- [Ethereum Address Validator](https://eth-converter.com/)
- [Blockchain Explorers](https://etherscan.io/)
- [Testnet Faucets](https://faucet.paradigm.xyz/)

### Community
- [Next.js Discord](https://discord.gg/nextjs)
- [Ethereum Stack Exchange](https://ethereum.stackexchange.com/)
- [OpenAI Community](https://community.openai.com/)

---

## 🎉 Congratulations!

You've successfully built a sophisticated AI chatbot with blockchain capabilities! Your application can now:

✅ Handle general AI conversations  
✅ Check ERC-20 token balances on LazAI testnet  
✅ Provide helpful error messages and guidance  
✅ Display formatted responses with markdown support  
✅ Handle multiple blockchain networks (with customization)  
✅ Deploy to production environments  

### Next Steps

1. **Add more blockchain features:**
   - Transaction history
   - NFT balance checking
   - Gas price estimation
   - Contract interaction

2. **Enhance the UI:**
   - Dark mode support
   - File upload capabilities
   - Voice input/output
   - Mobile app

3. **Improve AI capabilities:**
   - Multi-language support
   - Context memory
   - Custom training data
   - Integration with other AI models

4. **Add security features:**
   - Rate limiting
   - Input validation
   - API key rotation
   - Audit logging

Feel free to extend this foundation and build something amazing! 🚀

---

## 📄 License

This tutorial and code are provided as-is for educational purposes. Feel free to use, modify, and distribute according to your needs.

**Happy Coding!** 🎉 