import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

// Simple component for testing
const TestComponent = () => {
  return <div data-testid="test-component">Hello Testing World</div>
}

describe('Basic Test Suite', () => {
  it('should render a test component', () => {
    render(<TestComponent />)
    const element = document.querySelector('[data-testid="test-component"]')
    expect(element).toBeInTheDocument()
    expect(element?.textContent).toBe('Hello Testing World')
  })

  it('should perform basic assertions', () => {
    expect(1 + 1).toBe(2)
    expect('hello').toBe('hello')
    expect([1, 2, 3]).toHaveLength(3)
  })

  it('should handle async operations', async () => {
    const promise = Promise.resolve('async result')
    const result = await promise
    expect(result).toBe('async result')
  })
})
