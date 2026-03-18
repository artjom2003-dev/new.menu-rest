# MenuRest — Deploy Guide

## Quick Start (development)

### 1. Clone and configure
```bash
cp .env.example .env
# Edit .env — set passwords for DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET
```

### 2. Start infrastructure
```bash
docker compose up -d postgres redis elasticsearch garage
```

### 3. Init Garage (S3 storage) — run once
```bash
bash garage/init-garage.sh
# Copy the generated MINIO_USER and MINIO_PASSWORD into .env
```

### 4. Install dependencies
```bash
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 5. Run backend + frontend
```bash
# Terminal 1
cd backend && npm run start:dev

# Terminal 2
cd frontend && npm run dev
```

Open http://localhost:3000

---

## Production (Docker Compose)

### 1. SSL certificates
Place your SSL files in `nginx/ssl/`:
- `fullchain.pem`
- `privkey.pem`

### 2. Configure .env
```bash
cp .env.example .env
# Set all production values
```

### 3. Build and run
```bash
docker compose up -d --build
```

### 4. Init Garage (first time only)
```bash
bash garage/init-garage.sh
# Update MINIO_USER / MINIO_PASSWORD in .env
docker compose restart backend
```

---

## Services

| Service       | Port  | Description              |
|---------------|-------|--------------------------|
| Frontend      | 3000  | Next.js                  |
| Backend       | 3001  | NestJS API               |
| PostgreSQL    | 5432  | Main database            |
| Redis         | 6379  | Cache                    |
| Elasticsearch | 9200  | Full-text search         |
| Garage        | 3900  | S3-compatible storage    |
| Nginx         | 80/443| Reverse proxy (prod)     |
