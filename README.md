# 🛍️ SearchIQ — AI Product Search Shopping Platform

**Search Smarter. Find Better.**

SearchIQ is an AI-powered e-commerce product discovery platform designed to help users find relevant products using natural-language queries and semantic search. Instead of relying only on exact keyword matching, the platform aims to understand the meaning and intent behind a user's search to deliver more relevant product results.

Built with a modern full-stack architecture, SearchIQ combines web development, artificial intelligence, search technology, caching, and cloud-ready infrastructure.

> **Project Status:** 🚧 In Development

## 📌 Problem Statement

Traditional e-commerce search engines often depend on exact keywords, making it difficult for users to find products when they describe their requirements in natural language.

For example, a user searching for "comfortable black shoes for college under ₹2500" may not know the exact product name or brand.

SearchIQ aims to solve this problem through semantic search, natural-language query understanding, and intelligent product retrieval.

## 💡 Proposed Solution

SearchIQ combines AI-powered semantic search with a full-stack e-commerce platform to improve product discovery. Users can describe what they need in everyday language, refine the results using filters, and explore relevant products through a user-friendly interface.

### Example Search

**User Query:**
`I need a laptop for coding and AI projects under ₹60000`

**SearchIQ aims to identify:**
- Product category: Laptop
- Use case: Coding and AI development
- Budget: Up to ₹60,000

The search engine can then retrieve relevant products based on the available product data, semantic similarity, and applicable filters.

## ✨ Key Features

### 🔍 AI-Powered Product Search
- Natural-language product queries
- Semantic search using text embeddings
- Hybrid search combining keyword matching and semantic retrieval
- Search suggestions and autocomplete
- Query understanding for attributes such as category, brand, color, and price
- Product filtering, sorting, and relevance-based ranking

### 🛒 E-Commerce Functionality
- User registration and login
- Product catalog and category browsing
- Product details and specifications
- Shopping cart and wishlist
- Product comparison
- Checkout and order management
- Order history and tracking

### 🤖 Intelligent Product Discovery
- Similar product recommendations
- Personalized product suggestions
- Recently viewed products
- Search history
- AI-based product review summaries

### 🔔 Notifications
- Price-drop alerts
- Back-in-stock notifications
- Order status notifications

### 🛡️ Admin Dashboard
- Product and category management
- Inventory management
- Order management
- Search analytics
- Popular search tracking
- Zero-result search analysis

*Note: Features are being developed incrementally. This list describes the planned capabilities of the complete platform; not every feature is implemented yet.*

## 🧰 Technology Stack

| Technology | Purpose |
|---|---|
| React.js | Frontend user interface |
| Vite | Frontend development and build tooling |
| Tailwind CSS | Responsive UI styling |
| Node.js | Backend runtime |
| Express.js | REST API development |
| MongoDB | Primary database |
| Mongoose | MongoDB data modeling |
| Python | AI service development |
| FastAPI | AI service APIs |
| Sentence Transformers | Semantic text embeddings |
| OpenSearch | Full-text and vector search |
| Redis | Caching and temporary data |
| JWT | Authentication |
| Docker | Containerization |
| AWS | Planned cloud deployment |

## 🏗️ System Architecture

```text
                   USER
                    |
                    v
          React.js + Vite Frontend
                    |
                    v
           Node.js + Express API
                    |
        +-----------+-----------+
        |           |           |
        v           v           v
     MongoDB      Redis      FastAPI
   Primary Data   Cache     AI Service
                                |
                                v
                       Sentence Transformers
                                |
                                v
                            OpenSearch
                                |
                                v
                       Relevant Products
```

**Architecture principles:**
- MongoDB acts as the primary source of product and user data.
- Express.js handles public API requests and application logic.
- FastAPI provides a separate service for AI-related processing.
- Sentence Transformers generate embeddings for semantic search.
- OpenSearch supports keyword and vector-based product retrieval.
- Redis is intended to improve performance through caching.

### 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd SearchIQ
```

Replace `<YOUR_GITHUB_REPOSITORY_URL>` with your actual GitHub repository URL.

### 2. Start the Infrastructure

Ensure Docker Desktop is running, then execute these commands from the project root:

```bash
docker compose up -d
docker compose ps
```

MongoDB, Redis, and OpenSearch should start and become healthy before you continue.

### 3. Configure the Backend

Open the backend directory:

```bash
cd backend
```

In PowerShell, create or update the environment file:

```powershell
Copy-Item .env.example .env -Force
```

Install the dependencies:

```powershell
npm.cmd install
```

### 4. Start the Backend

```powershell
npm.cmd run dev
```

The backend is configured to use port `5000` by default.

### 5. Verify the Backend

Once the server has started, open these URLs in your browser:

| Endpoint | Purpose |
|---|---|
| `http://localhost:5000/api/v1/health` | Backend and dependency health check |
| `http://localhost:5000/api/v1/health/live` | Application liveness check |
| `http://localhost:5000/api/docs` | Swagger API documentation |

The full health endpoint should report MongoDB, Redis, and OpenSearch status.

**Note:** The commands above cover the Phase 1 backend foundation. The complete frontend, AI search service, and shopping workflows must be implemented and configured in their respective development phases before the whole platform can run.

## 🔐 Environment Variables

The backend uses environment variables for configuration. Common variables include:

```env
NODE_ENV=development
PORT=5000

MONGO_URI=mongodb://localhost:27017/searchiq
REDIS_URL=redis://localhost:6379
OPENSEARCH_NODE=http://localhost:9200

CORS_ORIGINS=http://localhost:5173
TRUST_PROXY=false
```

Refer to `backend/.env.example` for the complete configuration.

**Security:** Never commit `.env` files, passwords, secret keys, or production credentials to GitHub.

## 🎯 Project Goals

SearchIQ is being developed to demonstrate practical skills in:

- Full-stack web application development
- REST API design and integration
- Natural-language processing and semantic search
- Database modeling and search indexing
- Authentication and application security
- Caching and performance optimization
- Containerization and cloud deployment

## 🔮 Future Enhancements

Potential enhancements include voice-based product search, more personalized recommendations, improved search relevance, richer analytics, and scalable cloud deployment.

## 👩‍💻 Author

**Parkhi Kumari**

B.Tech Computer Science and Engineering — AI & Data Science

Interested in Full-Stack Development, Artificial Intelligence, NLP, and Software Engineering.

---
