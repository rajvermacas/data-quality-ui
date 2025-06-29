import '@testing-library/jest-dom'

// Add TextEncoder/TextDecoder polyfills for Node.js environment
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder
}
if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder
}

// Add ReadableStream polyfill for Node.js environment
if (typeof ReadableStream === 'undefined') {
  const { ReadableStream, WritableStream, TransformStream } = require('web-streams-polyfill')
  global.ReadableStream = ReadableStream
  global.WritableStream = WritableStream
  global.TransformStream = TransformStream
}

// Only set up browser-specific mocks when in jsdom environment
if (typeof window !== 'undefined') {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })

  // Mock ResizeObserver
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }))

  // Mock URL.createObjectURL and URL.revokeObjectURL
  global.URL.createObjectURL = jest.fn(() => 'mocked-url')
  global.URL.revokeObjectURL = jest.fn()
}