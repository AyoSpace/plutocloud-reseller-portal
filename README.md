# Pluto Cloud Computing — Reseller Portal

Production-grade cloud reseller portal built on Kubernetes.

**URL:** https://portal.plutocloudcomputing.ng

## Features
- Client VM ordering with live price calculator
- Paystack payment integration (fees passed to customer)
- Reseller portal with 20% discount and withdrawal system
- Admin dashboard with VM provisioning workflow
- Email notifications via Zoho SMTP
- 2FA authentication (Google Authenticator)
- PDF invoices with VAT (7.5%)
- Role-based access: client, reseller, finance_admin, super_admin

## Pricing
| Resource | Price/Month |
|---|---|
| vCPU | ₦24,500 |
| RAM per GB | ₦2,625 |
| Storage per GB | ₦108 |
| Windows OS | ₦30,000 |
| Ubuntu/CentOS | Free |
| Reseller Discount | 20% |
| VAT | 7.5% |

## Deployment

### 1. Build Docker images
```bash
cd backend && docker build -t plutocloud/portal-backend:latest .
cd frontend && docker build -t plutocloud/portal-frontend:latest .
docker push plutocloud/portal-backend:latest
docker push plutocloud/portal-frontend:latest
```

### 2. Initialize database
```bash
kubectl exec -n plutocloud-portal deploy/postgres -- psql -U plutocloud -d plutocloud -f /schema.sql
```

### 3. Deploy to Kubernetes
```bash
kubectl apply -f k8s/portal.yaml
```

### 4. Check deployment
```bash
kubectl get pods -n plutocloud-portal
kubectl get ingress -n plutocloud-portal
```

## Admin Accounts
- **Super Admin:** eniola@plutocloudcomputing.ng
- **Finance Admin:** tobe@plutocloudcomputing.ng

## Support
info@plutocloudcomputing.ng
