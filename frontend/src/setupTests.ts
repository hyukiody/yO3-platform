import '@testing-library/jest-dom'
import './i18n'
import { EventSource } from 'eventsource'

// Polyfill EventSource for Node.js test environment
global.EventSource = EventSource as any
