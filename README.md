# ADC Phase 2 - Adriano Dental Clinic Management System

A comprehensive dental clinic management system built with React TypeScript frontend and Node.js/Express backend.

## Features

### Core Modules
- **Billing Module**: Service-based billing with multiple payment methods (QR Code, Bank Transfer, Cash), installment billing, manual adjustments, and digital receipts
- **Inventory Module**: Complete inventory management with stock tracking, expiry monitoring, supplier management, and automated reorder alerts
- **Supplier Management**: Supplier database with purchase order tracking and delivery management
- **Prescription Module**: Digital prescription creation with medicine database, dosage management, and prescription history

### System Features
- **User Management**: Role-based access control (Superadmin, Admin, Moderator, Staff)
- **Authentication**: JWT-based authentication with secure login/logout
- **Responsive Design**: Mobile-friendly interface with dark/light theme support
- **Audit Trail**: Complete logging of all system activities and changes
- **Reporting**: Revenue reports, inventory reports, and analytics

## Tech Stack

### Frontend (adc-admin)
- React 18 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- shadcn/ui for UI components
- TanStack Query for data fetching
- TanStack Router for routing
- React Hook Form for form management
- Axios for API calls

### Backend (api)
- Node.js with Express
- TypeScript
- PostgreSQL database
- JWT authentication
- Bcrypt for password hashing
- CORS, Helmet for security
- Rate limiting

### Database
- PostgreSQL with comprehensive schema
- Proper indexing and relationships
- Audit logging
- Automatic timestamp updates

## Project Structure

```
adc-phase2/
├── adc-admin/          # Admin React frontend (http://localhost:5177)
├── adc-billing/        # Billing React frontend (http://localhost:5174)
├── adc-inventory/      # Inventory React frontend (http://localhost:5175)  
├── adc-prescription/   # Prescription React frontend (http://localhost:5176)
├── api/                # Node.js backend API
├── api-gateway/        # API Gateway service (http://localhost:3001)
├── api-billing/        # Billing API service
├── api-inventory/      # Inventory API service  
├── api-prescription/   # Prescription API service
├── packages/
│   ├── auth/           # Shared authentication package
│   └── portal/         # SSO Portal application (http://localhost:5173)
├── database/           # Database schema and sample data
├── package.json        # Root package.json for monorepo
└── README.md
```

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- VS Code (recommended)
- PostgreSQL extension for VS Code

## Installation

### 1. Clone and Install Dependencies

```bash
# Install root dependencies and workspace dependencies
npm run install:all
```

### 2. Database Setup

1. **Install PostgreSQL extension in VS Code**:
   - Open VS Code Extensions Marketplace
   - Search and install "PostgreSQL" by Chris Kolkman or "SQLTools + SQLTools PostgreSQL Driver"

2. **Create Database Connection in VS Code**:
   - Open Database Explorer panel in VS Code
   - Create new connection with these settings:
     - Host: localhost
     - Port: 5432  
     - User: postgres
     - Password: 
     - Database: 

3. **Create Database and Tables**:
   ```bash
   # Create the database first (if it doesn't exist)
   createdb "adc-phase2"
   
   # Run schema creation
   psql -d "adc-phase2" -f database/schema.sql
   
   # Load sample data
   psql -d "adc-phase2" -f database/sample_data.sql
   ```

### 3. Environment Configuration

Copy the API environment file and update if needed:
```bash
cd api
cp .env.example .env
# Edit .env file with your database credentials if different
```

### 4. Run the Application

The application now uses a **Single Sign-On (SSO)** portal system. All applications are integrated into a unified authentication system.

```bash
# Start all applications in development mode
npm run dev

# Or start specific combinations:
npm run dev2    # Billing + Portal + API Gateway + API Billing
npm run dev3    # Inventory + Portal + API Gateway + API Billing  
npm run dev4    # Admin + Portal + API Gateway + API Billing

# Or start individually:
npm run dev:portal       # SSO Portal (http://localhost:5173)
npm run dev:admin        # Admin App (http://localhost:5177)
npm run dev:billing      # Billing App (http://localhost:5174)
npm run dev:inventory    # Inventory App (http://localhost:5175)
npm run dev:prescription # Prescription App (http://localhost:5176)
npm run dev:gateway      # API Gateway (http://localhost:3001)
npm run dev:apibilling   # Billing API service
```

#### Application Access Flow:
1. **Start with Portal**: Access the main portal at http://localhost:5173
2. **Login**: Use the SSO login system with your credentials
3. **Access Applications**: Click on the application tiles in the portal to navigate to specific modules
4. **Seamless Navigation**: All applications share the same authentication session

#### Application URLs:
- **Portal (Main Entry)**: http://localhost:5173
- **Admin Dashboard**: http://localhost:5177  
- **Billing System**: http://localhost:5174
- **Inventory Management**: http://localhost:5175
- **Prescription System**: http://localhost:5176

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Create new user (Admin only)
- `GET /api/auth/verify` - Verify JWT token

### Modules
- `/api/users` - User management
- `/api/patients` - Patient records
- `/api/billing` - Billing and invoicing
- `/api/inventory` - Inventory management
- `/api/suppliers` - Supplier management
- `/api/prescriptions` - Prescription management

## Database Schema Overview

### Key Tables
- `users` - System users with role-based access
- `patients` - Patient information and medical history
- `service` - Dental services with pricing
- `invoice` - Billing and payment tracking
- `items` - Inventory items with stock management
- `suppliers` - Supplier information
- `prescriptions` - Digital prescription management

## Development

### Code Organization
- Clean architecture with separation of concerns
- TypeScript for type safety
- Proper error handling and logging
- Security best practices implemented
- Responsive design patterns

### Adding New Features
1. Create database migrations if needed
2. Add API endpoints in `/api/src/routes/`
3. Create frontend components in `/adc-admin/src/components/`
4. Update types in both frontend and backend

## Security Features
- JWT token authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- SQL injection prevention
- Input validation
- Audit trail logging

## Deployment

### Production Build
```bash
# Build both applications
npm run build

# Start production server
cd api && npm start
```

### Environment Variables for Production
Update the API `.env` file for production:
```env
NODE_ENV=production
JWT_SECRET=your-super-secure-secret-key
DB_HOST=your-production-db-host
# ... other production settings
```

## Contributing

1. Follow the existing code structure and patterns
2. Use TypeScript for type safety
3. Write meaningful commit messages
4. Test thoroughly before submitting changes
5. Update documentation as needed

## Support

For technical support or questions about the system, please refer to the project documentation or contact the development team.

## License

This project is proprietary software developed for Adriano Dental Clinic.
