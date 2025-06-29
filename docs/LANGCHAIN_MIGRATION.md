# LangChain Migration Guide

This document describes the migration from direct Gemini REST API calls to LangChain integration for the AI query functionality.

## Overview

The migration introduces LangChain as an abstraction layer over the Google Gemini API, providing better maintainability, standardized error handling, and easier integration with other LLM providers in the future.

## Architecture Changes

### Before (REST API)
```
route.ts → orchestrator.ts → apiCalls.ts → Direct REST calls to Gemini
```

### After (LangChain)
```
route.ts → langchainOrchestrator.ts → langchainService.ts → LangChain → Gemini
```

## Key Components

### 1. LangChain Service (`langchainService.ts`)
- **Purpose**: Provides LangChain-based implementations of Gemini API calls
- **Functions**:
  - `callGeminiWithCodeExecutionLC`: Handles code execution (hybrid approach)
  - `callGeminiWithStructuredOutputLC`: Returns structured JSON responses
  - `callGeminiDirectStructuredLC`: Direct structured queries without code execution
  - `withRetry`: Retry logic with exponential backoff

### 2. LangChain Orchestrator (`langchainOrchestrator.ts`)
- **Purpose**: Manages the two-step API call process using LangChain
- **Maintains**: Same logic flow as original orchestrator
- **Features**: Clarification detection, fallback handling, error recovery

### 3. Feature Flag Integration
- **Environment Variable**: `USE_LANGCHAIN=true`
- **Default**: Uses original REST implementation
- **Migration Path**: Allows gradual rollout and A/B testing

## Implementation Details

### Code Execution
LangChain now supports Gemini's code execution feature through the `bindTools` method:
- Uses native Gemini code execution tool: `{ codeExecution: {} }`
- Bound to the model using `model.bindTools([codeExecutionTool])`
- Maintains full compatibility with existing functionality
- Supports file context through system messages

### Structured Output
LangChain's structured output parsers provide:
- Type-safe JSON parsing with Zod schemas
- Better error messages for malformed responses
- Automatic retry on parsing failures

### Error Handling
Both implementations maintain identical error handling:
- 3 retry attempts with exponential backoff
- Jitter to prevent thundering herd
- Graceful fallbacks for various error scenarios

## Migration Steps

1. **Install Dependencies**
   ```bash
   npm install @langchain/google-genai @langchain/core zod
   ```

2. **Enable LangChain** (Optional)
   ```bash
   export USE_LANGCHAIN=true
   ```

3. **Test Both Implementations**
   ```bash
   # REST implementation (default)
   npm run dev

   # LangChain implementation
   USE_LANGCHAIN=true npm run dev
   ```

## Benefits

1. **Abstraction**: Easier to switch between LLM providers
2. **Type Safety**: Better TypeScript integration with Zod schemas
3. **Standardization**: Follows LangChain patterns and best practices
4. **Extensibility**: Easy to add new features like streaming, callbacks, etc.

## Compatibility

The migration maintains 100% API compatibility:
- Same request/response formats
- Same error codes and messages
- Same retry behavior
- Same file upload handling

## Testing

Run tests to ensure both implementations work correctly:
```bash
npm test langchainIntegration.test.ts
```

## Rollback

To rollback to REST implementation:
1. Remove or set `USE_LANGCHAIN=false`
2. The original code remains untouched and functional

## Future Enhancements

1. **Streaming Support**: Use LangChain's streaming capabilities
2. **Callbacks**: Add monitoring and logging callbacks
3. **Caching**: Implement LangChain's caching mechanisms
4. **Multi-Model Support**: Easy addition of other LLM providers