# Contributing to M.A.T.E. Agent Builder

We appreciate any form of contributions to the M.A.T.E. Agent Builder platform.

## 🐞 Report Bugs

Found an issue? Please report it by contacting support@getmate.ai with:
- A clear description of the problem
- Steps to reproduce the issue
- Expected vs. actual behavior
- System information (OS, browser, etc.)

## 💡 Feature Requests

Have ideas for new features? We'd love to hear them! Contact us at support@getmate.ai with:
- Description of the proposed feature
- Use case and expected benefits
- Any relevant examples or mockups

## 👨‍💻 Development

The M.A.T.E. Agent Builder is built as a monorepo with the following modules:

- `server`: Node backend for API logic
- `ui`: React frontend
- `components`: Node integrations and custom components

### Prerequisites

- Install [PNPM](https://pnpm.io/installation) v9 or higher
  ```bash
  npm i -g pnpm
  ```

### Local Development Setup

1. Clone the repository

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build all modules:
   ```bash
   pnpm build
   ```

4. Start in development mode:
   ```bash
   pnpm dev
   ```
   
   The application will be available at http://localhost:8080

5. For production build:
   ```bash
   pnpm build
   pnpm start
   ```

### Environment Configuration

See [ENV_CONFIGURATION.md](ENV_CONFIGURATION.md) for detailed information about environment variables.

## 📜 Code of Conduct

This project and everyone participating in it are governed by the Code of Conduct which can be found in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). 

By participating, you are expected to uphold this code. Please report unacceptable behavior to support@getmate.ai.

## 📧 Contact

For any questions or concerns, reach out to us at support@getmate.ai.
