import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import App from './App'

describe('App', () => {
  it('renders the portfolio page within router', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </ThemeProvider>
    )
    expect(screen.getByRole('heading', { name: /portfolio/i })).toBeInTheDocument()
  })
})
