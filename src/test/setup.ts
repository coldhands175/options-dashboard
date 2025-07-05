import '@testing-library/jest-dom'

// Global test setup
beforeAll(() => {
  // Setup code that runs before all tests
})

beforeEach(() => {
  // Setup code that runs before each test
})

afterEach(() => {
  // Cleanup code that runs after each test
})

afterAll(() => {
  // Cleanup code that runs after all tests
})

// Mock environment variables if needed
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
