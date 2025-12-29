import { EventEmitter } from 'events'

// Global singleton event emitter
// Note: In a serverless environment like Vercel, this might not work reliably across multiple lambda instances.
// However, since we are running on a VPS/Container (Coolify) with 'next start', this singleton 
// should persist for the lifetime of the process.
// If scaling to multiple instances, Redis Pub/Sub would be required.

class BoardEventEmitter extends EventEmitter {}

export const boardEvents = new BoardEventEmitter()

// Increase limit to avoid warnings with many connections
boardEvents.setMaxListeners(1000)
