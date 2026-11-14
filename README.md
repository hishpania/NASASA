# NASASA

Agro field selection platform: a React map client, a .NET Clean Architecture API on PostgreSQL, and standalone ML models.

## Structure

| Folder | Contents |
| --- | --- |
| `Backend/` | .NET 10 solution based on [Clean Architecture](https://github.com/jasontaylordev/CleanArchitecture): `Domain`, `Application`, `Infrastructure`, `Web` (minimal API), `AppHost` (Aspire orchestration) |
| `Frontend/` | React 19 + Vite + Tailwind (Catalyst UI) field selector with Leaflet maps |
| `Model/` | ML models, each one a separate program |

## Run everything

Requirements: .NET SDK 10, Node 22+, Docker.

```bash
cd Frontend && npm install && cd ..
dotnet run --project Backend/src/AppHost
```

The Aspire dashboard opens with links to:

- `webfrontend` — the React app
- `webapi` — the API with Scalar docs at `/scalar`
- `dbserver` — PostgreSQL with pgAdmin

The development database is seeded with `demo@neosphere.local` / `demo1234`.

## API

| Method | Route | Auth |
| --- | --- | --- |
| `POST` | `/api/Auth/register` | — |
| `POST` | `/api/Auth/login` | — |
| `GET` | `/api/Auth/me` | Bearer JWT |
| `GET` | `/api/Fields` | Bearer JWT |
| `POST` | `/api/Fields` | Bearer JWT |
| `PUT` | `/api/Fields/{id}` | Bearer JWT |
| `DELETE` | `/api/Fields/{id}` | Bearer JWT |

## Database

Migrations live in `Backend/src/Infrastructure/Data/Migrations` and are applied on startup in Development.

```bash
cd Backend
dotnet ef migrations add <Name> --project src/Infrastructure --startup-project src/Web --output-dir Data/Migrations
```

