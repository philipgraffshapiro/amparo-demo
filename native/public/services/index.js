import { createDemoServices } from './demo.js';

// The composition point for future integrations. UI modules receive this object.
// Replace an adapter here after its backend contract and failure tests exist.
export function createServices() {
  return createDemoServices();
}
