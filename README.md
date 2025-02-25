# Token Management System

This project is a full-featured token management system built with Node.js, Express, and MongoDB. It includes:

- **Admin Authentication:** Registration, login, and logout.
- **Account Types:** 
  - **Admin:** Can see and manage every token.
  - **User:** Can only create tokens and view the tokens they have created.
- **Token Management:** Generate tokens with extended metadata (customer name, location, description), track the token state, and record which admin created each token.
- **Device Management:** Track device keys for offline token validation.
- **Views:** EJS-based views for managing tokens and devices.

## Setup

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Update the MongoDB connection URI in `app.js`.
4. Run `npm start` to start the server.
5. Visit `http://localhost:4000` in your browser.

## License

MIT
