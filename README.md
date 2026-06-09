# distributed-ticketing-FrontEnd

## Overview

This repository contains the client application for the distributed ticketing platform.
It is the presentation layer of a larger system composed of three coordinated repositories:

- distributed-ticketing-FrontEnd: user interface and user journey orchestration
- distributed-ticketing-DBsystem: ticket inventory, scenarios, reservations, and purchase workflows
- distributed-ticketing-UserBEsystem: user accounts, authentication, verification, and password recovery

This frontend is designed to work together with the other two repositories. It is not intended to be treated as a standalone product, because the main application flows depend on the APIs exposed by both backend services.

## Purpose

The application provides the customer-facing experience for browsing events, selecting tickets, holding reservations, logging in, completing checkout, and managing account-related actions such as email verification and password reset.

## Main Features

- Event and scenario browsing
- Event capacity and ticket availability display
- Ticket selection and reservation flow
- Reservation adoption after authentication
- Checkout flow with Stripe payment integration
- Purchase confirmation and email dispatch
- Login, registration, email verification, and password reset screens
- Queue-related access through the dedicated waiting flow
- Server-side rendering support for improved initial load and crawlability

## Architecture

The frontend is an Angular 21 application with server-side rendering enabled. It uses the Angular router for navigation and the HTTP client to communicate with the backend services through a local proxy configuration.

The proxy configuration routes requests to the appropriate backend:

- `https://localhost:8080` for ticketing, reservations, purchase, queue, and search flows
- `https://localhost:8081` for user-management flows

## UML Sequence Diagram

The control flow diagram is split into three images:

### Part 1

<img width="2711" height="1930" alt="SequenceDiagram EsiEntradas Part1" src="https://github.com/user-attachments/assets/df69f175-bddf-4702-a5ce-24ea422d7db7" />

### Part 2

<img width="2710" height="2634" alt="SequenceDiagram EsiEntradas Part2" src="https://github.com/user-attachments/assets/97324704-7de2-49d3-9a37-00dc96d224e5" />

### Part 3

<img width="3395" height="3706" alt="SequenceDiagram EsiEntradas Part3" src="https://github.com/user-attachments/assets/cf9580a0-2937-48e3-98f9-aed0eeceaa76" />

## Key Frontend Flows

- Users browse scenarios and events from the ticketing backend.
- Available tickets are selected and temporarily reserved through the reservations API.
- If a user logs in after reserving tickets anonymously, the frontend can transfer those reservations to the authenticated user token.
- During checkout, the app requests a payment intent, collects card details through Stripe, and finalizes the purchase.
- Account actions such as login, verification, and password reset are handled through the user backend.

## Tech Stack

- Angular 21
- TypeScript 5.9
- RxJS 7.8
- SSR with `@angular/ssr`
- Stripe frontend SDK
- Node.js and npm

## Prerequisites

- Node.js compatible with the Angular 21 toolchain
- npm 11.x
- The two backend repositories running locally with HTTPS enabled
- A valid Stripe public key configured in the checkout flow

## Local Setup

1. Clone this repository together with distributed-ticketing-DBsystem and distributed-ticketing-UserBEsystem.
2. Install dependencies with `npm install`.
3. Start the two backend services first so the proxy targets are available.
4. Run the frontend with `npm start`.

## Available Scripts

- `npm start`: starts the Angular development server
- `npm run build`: builds the application
- `npm test`: runs the unit test suite
- `npm run watch`: builds in watch mode for development
- `npm run serve:ssr:distributed-ticketing-FrontEnd`: serves the SSR build

## Notes on Integration

- The login state is stored in the browser session and validated against the user backend.
- Anonymous reservations can be adopted by a logged-in user token.
- The application expects the backend repositories to remain aligned in terms of endpoints, payloads, and token handling.

## Related Repositories

- distributed-ticketing-DBsystem -> `https://github.com/SobrinoS29/distributed-ticketing-DBsystem`
- distributed-ticketing-UserBEsystem -> `https://github.com/SobrinoS29/distributed-ticketing-UserBEsystem`
- distributed-ticketing-FrontEnd -> `https://github.com/SobrinoS29/distributed-ticketing-FrontEnd`

## Security

This project includes several measures designed to reduce common security risks across the three repositories:

1. HTTPS is enabled with locally trusted certificates generated with `mkcert`, so the frontend and both backends can run over TLS during development.
2. The `userToken` is stored in `sessionStorage` instead of being exposed in the URL, which avoids leaking session data through navigation history or shared links.
3. Ticket reservations have a five-minute TTL in both the ticket selection and checkout flows, and expired reservations are cleaned up automatically through the reservations backend.
4. Email addresses can be masked in the database layer, and full access is restricted to authorized DBA-level users.
5. Passwords are handled with BCrypt so they are hashed and verified securely instead of being transmitted or stored as plain text.
6. Database access uses parameterized JPA queries to reduce SQL injection risk.
7. Email confirmation and password reset rely on expiring tokens rather than permanent links.
8. Sensitive database structures use neutral naming so the schema does not reveal unnecessary implementation details.
9. Registration responses avoid exposing whether an account already exists, reducing user enumeration and social engineering risk.
10. Database triggers can assign roles based on authorized email lists and keep audit timestamps updated automatically.
11. The system avoids exposing internal table names or dangerous operations directly through the UI, limiting dictionary-style abuse from the client side.

## License

Educational project. Images are used for educational purposes only.

## Author

Javier Sobrino Ocaña
