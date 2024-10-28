# Billi Dev Tools - Chrome Extension

A Chrome Developer Tools extension designed specifically for AIMA developers and testers to monitor API requests and identify environments.

## Features

### 1. Environment Indicator
- Visual indicator showing current environment (QA, QA2, QA3, LOCAL)
- Color-coded top bar for quick environment identification
- Environment label in browser tab title
- Clickable environment label to toggle Network Monitor

### 2. Network Monitor
- Real-time API request monitoring
- Captures requests to `*.aimapms.com/api/*` and `localhost`
- Displays:
  - Timestamp
  - Request path
  - HTTP method (color-coded)
  - Status code (color-coded)
  - URL parameters
  - Request/Response bodies
- Interactive UI with expandable request details
- JSON viewer for request and response data
- Maintains last 30 requests history

## Installation

### Development Mode
1. Clone the repository


npm run clean
npm run build

