import { isDBConnected } from '../config/db.js'

export function getHealth(req, res) {
  const isConnected = isDBConnected()
  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? 'ok' : 'error',
    db: isConnected ? 'connected' : 'disconnected',
  })
}
