# CANTEEN42 Backend

A standalone, API-ready, modular dropshipping platform backend.

## Project Overview

CANTEEN42 is a comprehensive dropshipping platform with the following components:

- **Backend API**: Express.js server with modular architecture
- **Admin Panel**: Dashboard for product, user, and order management
- **Checkout System**: Integrated with Stripe for secure payments
- **Analytics**: Track user behavior and sales performance
- **Email System**: Automated transactional emails

## Phase 1 Scope (MVP)

- **Products**: CRUD operations, categories, inventory management
- **Users**: Authentication, profiles, roles (customer, admin)
- **Orders**: Processing, status tracking, Stripe integration
- **Admin Controls**: Dashboard, user management, product management
- **Checkout**: Stripe integration, cart functionality
- **Email Triggers**: Order confirmations, shipping updates

## Tech Stack

- **Server**: Node.js with Express
- **Database**: PostgreSQL for relational data
- **Authentication**: Firebase Authentication
- **Payment Processing**: Stripe
- **Cloud Services**: Firebase for additional services

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- Firebase account
- Stripe account

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/kevink51/Canteen42-Backend-Devin.git
   cd Canteen42-Backend-Devin
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

4. Update the `.env` file with your credentials.

5. Start the development server:
   ```
   npm run dev
   ```

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create a new product
- `PUT /api/products/:id` - Update a product
- `DELETE /api/products/:id` - Delete a product

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login and get authentication token
- `PUT /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user

### Orders
- `GET /api/orders` - Get all orders (admin) or user orders (customer)
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create a new order
- `PUT /api/orders/:id` - Update an order
- `POST /api/orders/:id/cancel` - Cancel an order
- `PATCH /api/orders/:id/status` - Update order status (admin only)
- `DELETE /api/orders/:id` - Delete an order (admin only)

### Admin
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/products` - Manage products
- `GET /api/admin/users` - Manage users
- `GET /api/admin/orders` - Manage orders
- `GET /api/admin/analytics` - Get analytics data
- `POST /api/admin/bulk` - Perform bulk operations on products, users, or orders

### Analytics
- `GET /api/analytics/dashboard` - Get analytics dashboard data (admin only)
- `GET /api/analytics/users` - Get user statistics (admin only)
- `GET /api/analytics/products` - Get product statistics (admin only)
- `GET /api/analytics/orders` - Get order statistics (admin only)
- `POST /api/analytics/events/favorite` - Log product favorite event
- `POST /api/analytics/events/notify-me` - Log notify-me event
- `POST /api/analytics/events/cart-abandonment` - Log cart abandonment event
- `POST /api/analytics/events/custom` - Log custom event
- `GET /api/analytics/top-favorited` - Get top favorited products
- `GET /api/analytics/top-notify-me` - Get top notify-me products
- `GET /api/analytics/cart-abandonment` - Get recent cart abandonment data

### Email
- `GET /api/email/templates` - Get all email templates (admin only)
- `GET /api/email/templates/:id` - Get email template by ID (admin only)
- `POST /api/email/templates` - Create a new email template (admin only)
- `PUT /api/email/templates/:id` - Update an email template (admin only)
- `DELETE /api/email/templates/:id` - Delete an email template (admin only)
- `POST /api/email/trigger/notify-me` - Trigger notify-me email
- `POST /api/email/trigger/favorite` - Trigger favorite email
- `POST /api/email/trigger/cart-abandonment` - Trigger cart abandonment email

### Discounts
- `GET /api/discounts` - Get all discounts (admin only)
- `GET /api/discounts/:id` - Get discount by ID (admin only)
- `POST /api/discounts` - Create a new discount (admin only)
- `PUT /api/discounts/:id` - Update a discount (admin only)
- `DELETE /api/discounts/:id` - Delete a discount (admin only)
- `GET /api/discounts/:id/stats` - Get discount usage statistics (admin only)
- `GET /api/discounts/:id/redemptions` - Get discount redemptions (admin only)
- `POST /api/discounts/apply` - Apply discount to cart
- `POST /api/discounts/redemption` - Record discount redemption

### Webhooks
- `POST /api/webhook/stripe` - Stripe webhook endpoint

## Project Structure

```
src/
├── config/         # Configuration files
├── controllers/    # Request handlers
├── middleware/     # Custom middleware
├── models/         # Data models
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Utility functions
└── server.js       # Main application file
```

## Development Team

- **Main Developer**: Devin
- **Strategic Lead**: Kevin

## License

This project is proprietary and confidential.
