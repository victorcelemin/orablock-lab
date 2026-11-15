# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

HTML5, CSS3 y JavaScript estático puro (sin paso de compilación ni backend obligatorio; preparado para despliegue estático directo en Vercel y apertura directa en navegador).

## Brand Commitments

- **Estética elegida:** Estándar de la categoría (IDE oscuro de base de datos + bloques visuales conectables estilo Scratch clásico), aprobada explícitamente por el usuario como dirección visual base.
- **Referencias de calidad:** **Scratch / Blockly** (geometría de encastre categórico e inmediación visual), **Oracle SQL Developer** (estructura de paneles técnicos y legibilidad SQL/PL-SQL) y **VS Code** (ergonomía de editor oscuro, barras de estado y foco por teclado).

## Users

- **Primario:** Estudiantes de bases de datos y DBAs en formación que aprenden a redactar scripts de Oracle Database (SQL, PL/SQL, gestión de almacenamiento y RMAN) y a entender cómo funcionan internamente las estructuras físicas de almacenamiento.
- **Secundario:** Desarrolladores o DBAs junior que desean automatizar tareas en Oracle mediante agentes de IA y necesitan configurar un harness seguro (MCP, CLI, permisos y validación humana).

## Product Purpose

Permitir crear scripts válidos de Oracle Database conectando tarjetas visuales encastrables tipo Scratch, recomendar el agente de IA y harness adecuados según el flujo de trabajo y riesgo del script actual, y explicar de forma didáctica e interactiva cómo operan el Control File, los Datafiles y los Online Redo Logs. El éxito significa que un estudiante pueda armar un script sin errores sintácticos básicos, comprender qué pasa en disco y memoria cuando ese script se ejecuta, y llevarse un prompt y configuración de harness listos para operar con IA sin poner en riesgo la base de datos.

## Positioning

Unifica en un mismo espacio tres piezas que suelen enseñarse desconectadas: un ensamblador visual de bloques encastrables orientado a comandos reales de Oracle (no lógica genérica), un recomendador contextual de agentes y harnesses de IA acoplado al nivel de riesgo del script construido, y un laboratorio interactivo de almacenamiento físico (Control File, Datafile y Redo Log) sincronizado con las operaciones de Oracle.

## Operating Context

- Uso en navegador de escritorio y pantallas portátiles o tabletas durante sesiones de estudio, prácticas de laboratorio o preparación de scripts administrativos.
- Idioma de la interfaz y explicaciones: español, manteniendo las palabras clave, comandos, vistas `V$` y términos propios de Oracle (`CONTROLFILE`, `DATAFILE`, `REDO LOG`, `TABLESPACE`, `SCN`, `RMAN`, `SQL*Plus`, `SQLcl`) en su nomenclatura técnica estándar.
- Sin conexión a una instancia real de Oracle Database: toda generación, validación estructural de bloques, cálculo de riesgo y simulación de almacenamiento ocurre localmente en el cliente de forma determinista y educativa.

## Capabilities and Constraints

- **Ensamblador tipo Scratch:** Paleta categorizada de tarjetas conectables (Conexión/Sesión, DDL/Tablespaces, DML/Transacciones, PL/SQL, Almacenamiento y RMAN/Respaldo) con ranuras parametrizables, encastre vertical y reordenamiento/eliminación, más generación en vivo del script Oracle resultante (copiable y descargable en `.sql` / `.rman`), presets didácticos listos para cargar y advertencias sobre orden o dependencias (por ejemplo, `COMMIT` tras DML o `ARCHIVE LOG` / backups).
- **Recomendador contextual de Agentes y Harness de IA:** Evalúa el script actual (solo lectura, DDL de esquema, cambios de almacenamiento o backup/recovery RMAN), recomienda el agente y tipo de harness adecuados (por ejemplo: Oracle SQLcl MCP Server, CLI agents con aprobación por comando como Claude Code / Gemini CLI / Codex CLI, o entornos en contenedor/PDB efímera), explica los guardrails obligatorios (privilegio mínimo, modo read-only vs confirmación explícita, dry-run, separación CDB/PDB) y genera un prompt + archivo de reglas/configuración de harness listo para copiar adaptado al script activo.
- **Laboratorio didáctico de Almacenamiento Oracle:** Explica e ilustra interactivamente `Control File`, `Datafile` (y su relación lógica con Tablespaces, Segmentos, Extents y Bloques) y `Redo Log` (Online Redo Log groups/members, LGWR, DBWn, CKPT y secuencia de SCN/Write-Ahead Logging), permitiendo simular paso a paso transacciones (`INSERT`/`UPDATE`, `COMMIT`, `CHECKPOINT`, `LOG SWITCH`, caída de instancia y recuperación) para observar qué se escribe en cada archivo y cómo se sincronizan.
- **Restricción de veracidad:** No se simula conexión real a red ni se inventan métricas de rendimiento en vivo; los ejemplos de agentes, harnesses y comandos Oracle se basan en arquitectura y prácticas reales de Oracle Database y flujos de agentes con herramientas MCP/CLI.

## Product Principles

1. **Aprender ensamblando y observando causa-efecto:** Cada tarjeta conectada produce código Oracle legible y tiene impacto comprensible sobre la base y su riesgo operativo.
2. **Seguridad operacional desde el primer día:** La recomendación de IA prioriza harnesses con sandbox, principio de privilegio mínimo y confirmación humana ante operaciones destructivas o de almacenamiento.
3. **Claridad didáctica sin simplificación falsa:** Explicar Control File, Datafile y Redo Log con analogías comprensibles sin distorsionar conceptos reales como SCN, Write-Ahead Logging, checkpoints ni multiplexado.
4. **Flujo sin fricción:** Cambiar entre ensamblar bloques, consultar la recomendación de harness para ese script y simular el almacenamiento debe sentirse inmediato y conectado.

## Accessibility & Inclusion

- Cumplimiento WCAG 2.1 AA: contraste mínimo 4.5:1 en texto y controles, navegación completa por teclado (incluyendo agregar, mover, conectar/reordenar y editar tarjetas sin depender exclusivamente del arrastre con ratón), estados de foco visibles y soporte para `prefers-reduced-motion`.
