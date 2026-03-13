## **Technical Software Requirements Specification (SRS)**

**Project Name:** Multipurpose Inventory & Service Management System (MP Inventory & Service)  
**Technology Stack:** MERN (MongoDB, Express.js, React, Node.js) / PERN (PostgreSQL, Express.js, React, Node.js)

### 1\. Introduction

**Purpose:**  
This SRS defines the technical requirements, system architecture, API design, and implementation guidelines for building a secure, scalable web application that provides flexible inventory management for diverse business types. The system supports unified management of products (retail), raw materials and prepared items (restaurant), and services (service-based), with CRUD operations, real-time stock updates (where applicable), waste tracking, profit calculations (including % based on inventory vs. sold), due tracking, and role-based access control (RBAC). It ensures seamless sales across all item types while adapting to business-specific needs like recipe-based costing for prepared items.

**Scope:**

- Flexible item management: Retail (products, suppliers, customers); Restaurant (suppliers, raw materials, prepared menus with recipes, prepared items, customers); Service (services with waste tracking).  
- Purchases (for products/raw materials/supplies), Sales (unified for products/prepared items/services), Inventory (products/raw materials/prepared items only).  
- User authentication & authorization.  
- Basic reporting (history, dues, profit with %).  
- Waste tracking for products, raw materials, or prepared items.

Out of scope (initial version): Payment gateways, advanced analytics, multi-warehouse, mobile app, multi-currency support.

### 2\. Overall System Architecture

The application follows a client-server architecture with separation of concerns, designed for flexibility across business types (e.g., recipe costing in restaurant mode).

- **Frontend (Client Layer):** React-based Single Page Application (SPA) for responsive UI, supporting dynamic forms for item types (e.g., recipe builders for prepared menus).  
- **Backend (Server Layer):** Node.js \+ Express.js RESTful API server, handling business logic like profit % calculation (inventory stock vs. sold items) and waste adjustments.  
- **Database Layer:** NoSQL (MongoDB) for flexible schemas (e.g., embedded recipes in prepared items) or relational (PostgreSQL) for structured data (e.g., precise raw material tracking in restaurants).  
- **Communication:** HTTP/HTTPS via REST APIs (JSON payloads). Optional future: WebSockets (Socket.IO) for real-time stock/waste alerts.

**High-Level Architecture Diagram:**  
\[User Registration Flow (1)\]  
\[Application Read/Write Data Flow Diagram (2)\]

**Key Design Principles (2025 Best Practices):**

- Modular monorepo structure (backend \+ frontend in one repo) for easier maintenance across business modes.  
- Service layer pattern in backend for business logic separation (e.g., flexible item validation based on business type).  
- Clean, scalable folder structure to support extensibility (e.g., adding restaurant-specific recipe services).  
- Error handling & logging centralized, with waste/profit calculation hooks.  
- Use environment variables (.env) for configs (e.g., business type toggles).  
- Follow RESTful API standards (resource-based routes, proper HTTP methods/status codes).

**Folder Structure (Recommended):**  
**Backend (server/):**

server/

├── src/

│   ├── config/          \# db.js, env, constants (business type config)

│   ├── controllers/     \# authController, itemController, etc.

│   ├── middlewares/     \# auth.js (JWT verify), errorHandler.js, roleCheck.js

│   ├── models/          \# Item.js, Purchase.js, Sale.js, User.js, etc.

│   ├── routes/          \# itemRoutes.js, purchaseRoutes.js, etc.

│   ├── services/        \# business logic: stockService.js, profitService.js (with % calc)

│   ├── utils/           \# jwt.js, validators (Zod/Joi)

│   └── app.js / server.js

├── .env

└── package.json

**Frontend (client/):**

client/

├── src/

│   ├── components/      \# reusable: ItemForm (with business type switch), StockAlert, RecipeBuilder

│   ├── pages/           \# Dashboard, Items, Sales, Purchases, Login

│   ├── context/         \# AuthContext, InventoryContext (for flexible modes)

│   ├── hooks/           \# useAuth, useStock (with TanStack Query)

│   ├── services/        \# api.js (Axios instance)

│   ├── routes/          \# AppRoutes (React Router)

│   └── App.jsx

├── public/

└── package.json

### 3\. Tech Stack & Tools

The stack is chosen for flexibility, scalability, and ease of development:

- **MERN (MongoDB \+ Express \+ React \+ Node.js):** Preferred for NoSQL flexibility in handling varied item types (e.g., embedded recipes in prepared menus) and rapid prototyping. MongoDB excels in schema-less designs for restaurant raw material/prepared item tracking; Node.js/Express for async I/O in real-time stock updates; React for dynamic UIs (e.g., business type-specific forms).  
- **PERN (PostgreSQL \+ Express \+ React \+ Node.js):** Alternative for relational integrity in structured data (e.g., precise supplier/raw material links in restaurant mode). PostgreSQL supports complex queries for profit % (inventory vs. sold) and waste tracking; same Express/React/Node for consistency. Use PERN if business requires strict ACID compliance (e.g., financial reporting).

**Core Tools:**

- **Frontend:** React 18+/Next Js, React Router v6/App Router, Axios, TanStack Query (caching/queries for flexible item lists), Context API / Zustand (state management for business modes), Tailwind CSS, ShadCn Ui, React Hook Form \+ Zod (validation).  
- **Backend:** Node.js 20+, Express.js 4+ (routing), Mongoose (MongoDB) or Prisma (PostgreSQL), JWT (jsonwebtoken) for auth, bcryptjs (password hashing).  
- **Database:** MongoDB 7+ (Atlas for MERN) or PostgreSQL 16+ (for PERN).  
- **Authentication:** JWT (access \+ refresh tokens).  
- **Other:** dotenv (configs), cors (CORS), helmet (security headers), morgan/winston (logging), Zod/Joi (validation).  
- **Deployment:** Initial deployment on Vercel/Netlify (frontend), Render/Heroku (backend), and MongoDB Atlas or Supabase (DB).

### 4\. Basic API Design

RESTful APIs with endpoints grouped by resource. All endpoints use JWT auth (except public ones). Responses: JSON with status codes (200 OK, 400 Bad Request, 401 Unauthorized, 500 Internal Server Error).

- **Auth APIs:**  
    
  - POST /api/auth/register: Create user (body: {name, email, password, role}). Returns JWT.  
  - POST /api/auth/login: Login (body: {email, password}). Returns JWT.  
  - GET /api/auth/profile: Get user profile (protected).


- **Item APIs (Flexible for Business Types):**  
    
  - POST /api/items: Create item (body: {name, type, businessMode, unit, cost\_price, selling\_price, recipe? (for restaurant)}).  
  - GET /api/items: List items (query: ?type=product\&businessMode=restaurant).  
  - PUT /api/items/:id: Update item (e.g., add recipe for prepared menu).  
  - DELETE /api/items/:id: Delete item.


- **Purchase APIs:**  
    
  - POST /api/purchases: Create purchase (body: {supplier\_id, items\[\], total, paid}). Updates stock/raw materials.  
  - GET /api/purchases: List purchases (query: ?status=pending).


- **Sales APIs:**  
    
  - POST /api/sales: Create sale (body: {customer\_id, items\[\], discount, paid}). Deducts stock (if applicable), calculates profit %.  
  - GET /api/sales: List sales (query: ?dateRange=... ).


- **Inventory APIs:**  
    
  - GET /api/inventory: List stock (query: ?itemType=prepared). Includes waste adjustments.  
  - PUT /api/inventory/:id/adjust: Adjust stock/waste (body: {quantity, reason}).


- **Report APIs:**  
    
  - GET /api/reports/profit: Profit summary (query: ?period=monthly, businessMode=restaurant). Includes % calc.

### 5\. Security Layer & Best Practices

- **Authentication:** JWT-based (access token short-lived \~15-60 min, refresh token long-lived \~7-30 days, httpOnly cookie for refresh).  
- **Authorization (RBAC):** Middleware checks user.role or permissions array. Protect routes (e.g., admin-only for user management).  
- **Password Security:** bcrypt hashing (salt rounds 12+). Never store plain passwords.  
- **Token Security:**  
  - Sign with strong secret (min 64 chars, env variable).  
  - Use HTTPS in production.  
  - Store access token in memory (not localStorage to prevent XSS).  
  - httpOnly \+ Secure \+ SameSite=Strict cookies for refresh token.  
- **Input Validation & Sanitization:** Zod/Joi on backend, React Hook Form \+ Zod on frontend.  
- **API Protection:**  
  - Rate limiting (express-rate-limit).  
  - Helmet for security headers (XSS, clickjacking protection).  
  - CORS restricted to frontend origin.  
- **Data Protection:**  
  - No sensitive data in JWT payload (only user ID \+ role).  
  - Audit logs for critical actions (create/update/delete).  
- **Error Handling:** Global error middleware – never expose stack traces in production.  
- **Other:** Brute-force protection on login, secure secret management.

### 6\. Functional Flows (Technical)

- **Add Item (Flexible):** POST /api/items → validate businessMode/type → if restaurant, embed recipe (raw materials \+ quantities); if product, init inventory.  
- **Purchase:** POST /api/purchases → add items\[\] → update stock/raw materials; auto-calc total/cost.  
- **Prepare Item (Restaurant):** POST /api/prepared-items → deduct raw materials per recipe → create prepared item stock.  
- **Sale (Unified):** POST /api/sales → validate stock (if product/raw/prepared) → deduct quantity/waste → calc profit (selling \- cost) \* qty \+ % (vs. inventory).  
- **Waste Adjustment:** PUT /api/inventory/:id/waste → log waste for products/raw/prepared; update profit calcs.  
- **Profit Report:** GET /api/reports/profit → aggregate (SUM((selling \- cost) \* qty)) / total inventory \* 100 for %.

Figma Link- [Figma](https://www.figma.com/design/mgDAxgDg1R24NX7gl6Xcos/Multipurpose-Inventory-Management?t=uk1if0BdfAXjNxTc-1)

Diagrams\-![]

<img src="https://res.cloudinary.com/dlrycnxnh/image/upload/v1773400516/Untitled-2026-03-12-2336_l0hx71.png" alt="Alt Text" width="500">
<img src="https://res.cloudinary.com/dlrycnxnh/image/upload/v1773400517/Untitled-2026-03-12-2342_r7wfej.png" alt="Alt Text" width="500">
<img src="https://res.cloudinary.com/dlrycnxnh/image/upload/v1773400516/Untitled-2026-03-12-2341_mdi4gr.png" alt="Alt Text" width="500">
<img src="https://res.cloudinary.com/dlrycnxnh/image/upload/v1773400517/Untitled-2026-03-12-2338_lnbfo0.png" alt="Alt Text" width="500">
<img src="https://res.cloudinary.com/dlrycnxnh/image/upload/v1773400517/Untitled-2026-03-12-2340_qwlmqr.png" alt="Alt Text" width="500">
<img src="https://res.cloudinary.com/dlrycnxnh/image/upload/v1773400517/Untitled-2026-03-12-2339_ea9hwn.png" alt="Alt Text" width="500">
<img src="https://res.cloudinary.com/dlrycnxnh/image/upload/v1773400516/Untitled-2026-03-12-2337_ownosg.png" alt="Alt Text" width="500">


