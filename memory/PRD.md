# ElectroGestor — PRD

## Problem Statement (original)
App móvil en español (Perú, soles S/, formato es-PE) para un vendedor de electrónica, con sincronización en la nube (datos compartidos entre compañeros). Onboarding pide solo un nombre (sin contraseña). Home = categorías (tipos de producto); dentro de una categoría se ven marcas auto-generadas del campo "Marca" (agrupadas ignorando mayúsculas/acentos); dentro de una marca, sus productos. Formulario de producto (crear/editar): Marca, Modelo, Precio (obligatorios), SKU opcional, selector de categoría, colores dinámicos (nombre + SKU), notas; garantía calculada en vivo por categoría+rango de precio con la SUMA. Detalle con selección de color, códigos (SKU producto/color/rango), precio+garantía+SUMA, editar/eliminar. Configuración: categorías (CRUD, no borrar si tiene equipos) y reglas de garantía (rangos por precio). Eliminaciones con modal centrado Sí/No. Buscador por marca/modelo. Tema claro/oscuro. Empezar vacío.

## Architecture
- Frontend: Expo Router (React Native), @tanstack/react-query (polling cada 12s + refetch on focus para sync colaborativo), tema claro/oscuro en `src/theme.ts`, iconos `@react-native-vector-icons/ionicons`.
- Backend: FastAPI + MongoDB (motor). Rutas con prefijo `/api`. Soft-delete (`deleted_at`). UUID string ids, `_id` excluido.
- Navegación: Tabs (Inicio / Buscar / Ajustes) + stack para categoría → marca → productos → detalle/formulario y pantallas de configuración.

## User Personas
- Vendedor(es) de una tienda de electrónica que comparten un mismo catálogo e inventario en la nube.

## Core Requirements (static)
- Moneda S/ es-PE; garantía depende SOLO de categoría + rango de precio.
- Marcas derivadas de productos (no administración separada).
- Confirmación de borrado centrada Sí/No para productos, categorías, rangos y colores.
- Persistencia en la nube compartida; identidad solo por nombre.

## Implemented (2026-10-03)
- Onboarding (nombre, sin contraseña) + persistencia local + registro en backend.
- Tabs: Inicio (categorías en grid + FAB), Buscar (global por marca/modelo), Ajustes.
- Categoría → marcas agrupadas (normalizando acentos/mayúsculas) → productos por marca.
- Formulario producto crear/editar: validaciones, colores dinámicos, selector de categoría (chips), garantía y SUMA en vivo en barra inferior sticky (teclado-aware).
- Detalle: pantalla "Elige el color" si hay >1 color; precios + SUMA; sección de códigos (SKU producto/color/rango); Cambiar color, Editar, Eliminar.
- Configuración de categorías (CRUD, bloqueo de borrado con equipos) y de reglas de garantía (rangos min/max/"sin límite"/precio/SKU).
- Modal de confirmación centrado Sí/No; toasts; tema claro/oscuro.
- QA: backend 22/22 pytest; flujos frontend verificados.

## Backlog / Remaining
- P1: Compartir/exportar el detalle del producto como texto o PDF.
- P2: Historial/auditoría de quién cambió qué (dado que es colaborativo).
- P2: Indicador de "sincronizando" y manejo explícito offline (cola de cambios).

## Next Tasks
- Según feedback del usuario.
