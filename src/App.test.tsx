import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import App from './App'
import { AuthProvider } from './context/AuthContext'

// Mock the router for testing
const MockedApp = () => (
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
)

describe('App', () => {
  it('renders without crashing', () => {
    render(<MockedApp />)
    // Basic test to ensure the app renders
    expect(document.body).toBeInTheDocument()
  })

  it('contains the main application structure', () => {
    render(<MockedApp />)
    // You can add more specific tests based on your app structure
    const app = screen.getByRole('main', { hidden: true }) || document.querySelector('[role="main"]') || document.body
    expect(app).toBeInTheDocument()
  })
})
