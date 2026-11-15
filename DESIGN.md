---
name: OraBlock Lab
description: Estándar oscuro de IDE de base de datos unido a tarjetas conectables estilo Scratch clásico para ensamblar scripts Oracle, recomendar harnesses de IA y simular almacenamiento físico.
colors:
  canvas-ground: "#0f172a"
  panel-surface: "#1e293b"
  elevated-surface: "#273449"
  recessed-code: "#0b1120"
  border-subtle: "#334155"
  border-strong: "#475569"
  text-primary: "#f8fafc"
  text-secondary: "#cbd5e1"
  text-muted: "#94a3b8"
  white-ink: "#ffffff"
  accent-primary: "#1d4ed8"
  accent-hover: "#1e40af"
  accent-active: "#2563eb"
  accent-focus: "#60a5fa"
  link-sky: "#93c5fd"
  ctrl-amber: "#fcd34d"
  code-string: "#fca5a5"
  status-open: "#6ee7b7"
  risk-low-bg: "#064e3b"
  risk-low-fg: "#a7f3d0"
  risk-med-bg: "#78350f"
  risk-med-fg: "#fde68a"
  risk-high-bg: "#7f1d1d"
  risk-high-fg: "#fecaca"
  scratch-session: "#334155"
  scratch-ddl: "#1d4ed8"
  scratch-ddl-edge: "#3b82f6"
  scratch-dml: "#047857"
  scratch-dml-edge: "#10b981"
  scratch-storage: "#b45309"
  scratch-storage-edge: "#f59e0b"
  scratch-plsql: "#6d28d9"
  scratch-plsql-edge: "#8b5cf6"
  scratch-rman: "#b91c1c"
  scratch-rman-edge: "#ef4444"
typography:
  headline:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  canvas-title:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "1.4rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.015em"
  body:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  ui-label:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
  caption:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  mono:
    fontFamily: "JetBrains Mono, Cascadia Code, Consolas, monospace"
    fontSize: "0.8rem"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  xs: "3px"
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  sm: "8px"
  md: "14px"
  lg: "20px"
components:
  button-primary:
    backgroundColor: "{colors.accent-primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "7px 13px"
  button-secondary:
    backgroundColor: "{colors.elevated-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "7px 13px"
  mode-tab-active:
    backgroundColor: "{colors.accent-primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "7px 12px"
  panel-card:
    backgroundColor: "{colors.panel-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "18px 20px"
---

# Design System: OraBlock Lab

## Overview

**Creative North Star: "El Taller Cartográfico de Oracle + Scratch"**

OraBlock Lab adopta el estándar profesional de los entornos oscuros de bases de datos (Oracle SQL Developer, VS Code) fusionado con la inmediatez visual de las piezas encastrables de Scratch/Blockly. La interfaz rechaza adornos decorativos y se organiza por contraste de capas tonales oscuras, bordes finos de 1px y colores categóricos funcionales exclusivamente reservados para distinguir las capas de comandos Oracle y estados de riesgo.

**Key Characteristics:**
- Tres superficies operativas bien diferenciadas por luminancia (`#0b1120` código empotrado, `#0f172a` lienzo de trabajo, `#1e293b` paneles y barras).
- Tarjetas Scratch con muesca superior entrante y espiga inferior saliente en trapecio que encastran verticalmente sin brechas ambiguas.
- Bloques contenedores C para `PL/SQL BEGIN ... END;` y `FOR ... LOOP` con espina lateral sólida y zona interna de anidamiento.
- Contraste mínimo WCAG AA (≥4.5:1) verificado en todas las categorías cromáticas sobre texto blanco.

## Colors

La paleta separa estrictamente las superficies neutras del IDE de los seis tintes categóricos de comandos Oracle.

### Primary
- **SQL Cobalt** (`#1d4ed8`): Acciones primarias de cabecera, pestaña activa de módulo y tarjetas DDL.

### Secondary
- **Focus Sky** (`#60a5fa`): Anillos de foco por teclado (`:focus-visible`), cursor de edición (`caret-color`) y resaltado de zonas activas en el simulador de almacenamiento.

### Tertiary
- **Transaction Emerald** (`#047857`): Tarjetas DML/Transacciones y estado saludable (`OPEN`).
- **Storage Amber** (`#b45309`): Tarjetas de almacenamiento físico (`TABLESPACE`, `DATAFILE`, `CHECKPOINT`).
- **PL/SQL Violet** (`#6d28d9`): Contenedores C y sentencias `DBMS_OUTPUT`.
- **RMAN Crimson** (`#b91c1c`): Tarjetas de respaldo/recuperación RMAN y alertas críticas.

### Neutral
- **Recessed Code Ink** (`#0b1120`): Fondo de bloques de código SQL/RMAN, inputs internos de tarjetas y barra de pestañas.
- **Workspace Slate** (`#0f172a`): Fondo principal del lienzo Scratch y del área de trabajo.
- **Panel Slate** (`#1e293b`): Cabecera, riel de paleta, inspector derecho y tarjetas de módulos.
- **Elevated Control** (`#273449`): Botones secundarios y estados hover interactivos.
- **Hairline Border** (`#334155` / `#475569`): Divisores estructurales de 1px entre paneles y controles.
- **Primary Ink** (`#f8fafc`), **Secondary Ink** (`#cbd5e1`), **Muted Ink** (`#94a3b8`): Jerarquía de texto con contraste superior a 5.6:1 sobre panel.

### Named Rules
**The Category-Exclusive Color Rule.** Los colores saturados pertenecen únicamente a las tarjetas de comando Scratch, indicadores de riesgo y botón primario; los paneles contenedores nunca compiten con tintes decorativos.

## Typography

**Display & UI Font:** `IBM Plex Sans` (con respaldo `'Segoe UI', system-ui, -apple-system, sans-serif`)
**Mono Font:** `JetBrains Mono` (con respaldo `'Cascadia Code', Consolas, monospace`)

**Character:** Escala compacta de herramienta técnica (escala fija en `rem`/`px`, sin `clamp` fluido en barras) optimizada para lectura prolongada de código SQL/RMAN junto a controles densos.

### Hierarchy
- **Headline** (700, `1.6rem`, line-height 1.25, tracking `-0.02em`): Títulos principales de módulo (`Agentes IA y Harness`, `Almacenamiento Oracle`).
- **Canvas H1** (700, `1.4rem`, line-height 1.25): Título del lienzo Scratch.
- **Title** (700, `1.05rem`, line-height 1.35): Cabeceras de paneles y tarjetas diagnósticas.
- **Body** (400, `15px`, line-height 1.5, máx. 72ch en prosa): Explicaciones didácticas, diagnósticos de harness y guías de archivos.
- **Mono** (400–600, `0.8rem`, `tabular-nums`): Código SQL/RMAN resaltado, números de línea, contadores SCN y valores dentro de ranuras Scratch.

### Named Rules
**The Tabular Numerals Rule.** Todo contador de secuencia, línea de script, número de bloque (`01`, `02`) y SCN aplica `font-variant-numeric: tabular-nums` para evitar saltos visuales al simular pasos.

## Layout

En escritorio (`> 1180px`), el Ensamblador Scratch opera en tres columnas sobre el viewport completo: paleta izquierda fija (`310px`), lienzo central flexible (`minmax(0, 1fr)`) e inspector derecho (`410px`). Los módulos de Agentes IA y Almacenamiento usan un contenedor centrado (`max-width: 1360px`) con rejillas de 2 y 3 columnas. Por debajo de `960px` las columnas apilan verticalmente y a `<= 640px` la barra superior organiza las pestañas a ancho completo con botones de mínimo `44px` de alto y cero desbordamiento horizontal.

## Elevation & Depth

Superficies planas por defecto diferenciadas por paso tonal (`#0b1120` → `#0f172a` → `#1e293b` → `#273449`) y divisores de `1px`. La única sombra elevada (`0 8px 24px rgba(0, 0, 0, 0.45)`) se reserva al toast flotante de confirmación y el único borde luminoso (`box-shadow: 0 0 0 1px #60a5fa`) marca nodos activos durante la simulación paso a paso de Oracle.

## Shapes

Radios discretos de herramienta técnica (`4px` en botones, pestañas e inputs; `6px` en tarjetas Scratch y nodos de almacenamiento; `8px` en tarjetas de módulo). Las tarjetas Scratch incorporan geometría trapezoidal de encastre (`clip-path: polygon(0 0, 100% 0, 82% 100%, 18% 100%)`) en `::before` y `::after` para representar unión física vertical.

## Components

### Buttons
- **Shape:** Rectángulo técnico (`4px` de radio), altura mínima `36px` (`44px` en móvil `<= 640px`).
- **Primary:** Relleno `#1d4ed8`, texto `#ffffff`, borde `#3b82f6`, hover `#1e40af`.
- **Secondary / Ghost:** Relleno `#273449` o transparente con borde `#475569`/`#334155`, foco visible `#60a5fa`.

### Scratch Command Cards & C-Blocks
- **Corner Style:** `6px` de radio con muesca superior entrante y espiga inferior saliente de `7px`.
- **Background:** Color sólido categórico (`#334155`, `#1d4ed8`, `#047857`, `#b45309`, `#6d28d9`, `#b91c1c`) con borde interno superior sutil.
- **Inline Parameters:** Campos de texto y selects empotrados sobre `#0b1120` con `<label>` explícito y controles de teclado (`Subir`, `Bajar`, `Duplicar`, `Eliminar`).

### Navigation
- Pestañas de módulo con `role="tablist"`, fondo activo `#1d4ed8` y apilado vertical completo en móvil.

## Do's and Don'ts

### Do:
- **Do** mantener contraste mínimo 4.5:1 en cada color de categoría Scratch sobre texto blanco y sobre fondos oscuros.
- **Do** usar transiciones cortas (`120ms–200ms`) con `cubic-bezier(0.23, 1, 0.32, 1)` solo sobre propiedades GPU (`transform`, `opacity`) o color/borde, respetando `prefers-reduced-motion`.
- **Do** garantizar que toda acción de arrastre en el lienzo tenga equivalente por clic y teclado.

### Don't:
- **Don't** usar emojis como iconos de interfaz; emplear SVG inline con trazo consistente.
- **Don't** aplicar `border-left` o `border-right` gruesos de color en tarjetas o alertas; usar el encastre Scratch o bordes uniformes de `1px`.
- **Don't** introducir textos en mayúsculas sostenidas como etiquetas decorativas sobre encabezados ni usar `transition: all`.
