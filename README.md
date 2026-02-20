# AquaFootprint Copilot (P0 MVP)

Monolithic, minimal y responsive web app para calcular huella hidrica azul/verde/gris por unidad de producto, con wizard UI, route handlers stateless, graficos y exportacion.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- shadcn/ui-style components con CSS Variables
- Recharts (patron shadcn charts)

## Fuentes base usadas

- `/Users/klashxx/Code/afp-core/docs/01_Bases_reguladoras_Retos_2026_EDIH_e5bb7637f0.pdf`
- `/Users/klashxx/Code/afp-core/docs/TheWaterFootprintAssessmentManual_Spanish.pdf`

Notas de implementacion:
- Componente gris aplicada con la forma estandar WFA: `V_grey = L / (Cmax - Cnat)`.
- Se asume `L` en mg (conversion desde kg), `Cmax`/`Cnat` en mg/L.
- Salida final normalizada a `L/kg`.

## Features P0

- Wizard visual en 4 pasos (estudio, entradas, revision, resultados)
- Inputs:
  - `production_total_kg`
  - `blue_m3`
  - `green_m3`
  - `grey`: `enabled`, `pollutant`, `load_kg`, `cmax_mg_l`, `cnat_mg_l`
- Validacion robusta con errores bloqueantes + warnings claros
- Warning explicita cuando `cnat_mg_l` no viene y se aplica `0`
- Calculo de:
  - `WF blue` (L/kg)
  - `WF green` (L/kg)
  - `WF grey` (L/kg)
  - `WF total` (L/kg)
- Exportacion:
  - PDF (route handler server-side)
  - CSV (route handler server-side)
- CSV import:
  - descarga template
  - subida archivo
  - validacion server-side
  - preview
  - apply al estudio actual
- Persistencia local (sin DB):
  - estudio actual en `localStorage`
  - variante de tema en `localStorage`
- Export/Import estudio `.json`
- Demo rapido: `Load example: Tomate invernadero`
- Theming por variantes CSS variables con `<html data-variant="...">`
  - `agro-premium` (default)
  - `copilot-sleek`

## Arquitectura

- Frontend: wizard client-side (`/Users/klashxx/Code/afp-core/components/wizard/app.tsx`)
- Logica y validacion compartida:
  - `/Users/klashxx/Code/afp-core/lib/water-footprint.ts`
  - `/Users/klashxx/Code/afp-core/lib/csv.ts`
  - `/Users/klashxx/Code/afp-core/lib/pdf.ts`
- API stateless:
  - `POST /api/calculate`
  - `POST /api/csv/validate`
  - `GET /api/csv/template`
  - `POST /api/export/csv`
  - `POST /api/export/pdf`

## Run

1. Instalar dependencias:
   - `npm install`
2. Ejecutar en local:
   - `npm run dev`
3. Abrir:
   - `http://localhost:3000`

## Validate

1. Smoke tests:
   - `npm test`
2. Validacion manual:
   - cargar demo `Tomate invernadero`
   - calcular y confirmar KPIs L/kg
   - exportar PDF/CSV
   - descargar template CSV, subirlo y aplicar preview
   - exportar/importar JSON
   - recargar navegador y validar persistencia en `localStorage`

## Deploy (Vercel Hobby)

- Runtime serverless/ephemeral.
- No persistencia en servidor.
- No dependencia de filesystem persistente (solo responses y memoria de request).

