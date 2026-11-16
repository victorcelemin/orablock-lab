# OraBlock Lab

Aplicación web **100% estática** (HTML5 + CSS3 + JavaScript vanilla sin build ni dependencias de servidor) para aprender y construir flujos de **Oracle Database**:

1. **Ensamblador de Scripts Oracle tipo Scratch:** conecta tarjetas encastrables por categoría (`Sesión`, `DDL`, `DML`, `Disco`, `PL/SQL` con bloques C anidables, y `RMAN`), edita parámetros inline y obtén código Oracle SQL / PL-SQL / RMAN listo para copiar o descargar (`.sql` / `.rman`) con análisis automático de riesgos e impacto en archivos.
2. **Recomendador de Agentes IA y Harness Seguros:** evalúa el riesgo del script activo y el entorno objetivo (`local_pdb`, `staging`, `prod_ro`, `cicd`) para recomendar la combinación más segura entre Agente IA y Harness (`sqlcl -mcp`, usuario Read-Only, PDB efímera o Git sandbox PR), con generación de prompt, `AGENTS.md` y `mcp.json`.
3. **Almacenamiento Oracle Didáctico y Simulador Interactivo:** explica de forma visual y sencilla qué hacen `Control File (.ctl)`, `Datafile (.dbf)` y `Online Redo Log (.log)` e incluye un simulador paso a paso (1 a 6) de memoria RAM (SGA), procesos (`LGWR`, `DBWn`, `CKPT`, `SMON`), *Write-Ahead Logging* y recuperación *Roll Forward* / *Roll Back* tras cortes eléctricos.

## Estructura del proyecto

- `index.html` — Estructura accesible de los 3 módulos.
- `styles.css` — Sistema visual IDE oscuro + bloques Scratch responsivos (desktop y móvil `375px`).
- `js/catalog.js` — Catálogo de 37 comandos Oracle (incluyendo contenedores C `IF..THEN`, `FOR LOOP`, `CURSOR FOR`, `BEGIN..END` y `RMAN RUN { ... }`), plantillas guiadas, generador SQL/RMAN con mapa de líneas y linter de seguridad.
- `js/agents.js` — Matriz de agentes y harnesses Oracle + generador de prompt, `AGENTS.md` y `mcp.json`.
- `js/storage.js` — Motor del simulador transaccional / Crash Recovery y guías didácticas (`Control File`, `Datafile`, `Redo Log`).
- `js/app.js` — Estado reactivo, drag-and-drop, historial Deshacer/Rehacer, controles accesibles por teclado y persistencia local (`localStorage`).
- `vercel.json` — Cabeceras de seguridad y URLs limpias.

## Ejecución local

Abre `index.html` directamente en tu navegador o sirve la carpeta con cualquier servidor HTTP estático:

```bash
python -m http.server 4173 --bind 127.0.0.1
```
