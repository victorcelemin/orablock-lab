(function (global) {
  "use strict";

  var AGENTS_CATALOG = [
    {
      id: "sqlcl-mcp-cli",
      agent: "Gemini CLI / Claude Code",
      harness: "Oracle SQLcl MCP Server (sqlcl -mcp)",
      isolation: "Usa un perfil de conexión guardado y te pide permiso antes de cambiar tablas o datos",
      bestFor: "Aprender y trabajar en una base local (PDB) con ayuda paso a paso",
      maxRisk: "Medio (pide tu OK antes de editar)",
      summary: "Conecta la IA mediante el puente oficial de Oracle (SQLcl MCP) sin tener que escribir contraseñas dentro del chat.",
      whyItWorks: "El harness solo expone herramientas seguras y frena cualquier CREATE, UPDATE, DELETE o TRUNCATE hasta que tú apruebes.",
      steps: [
        "Guarda tu conexión en SQLcl con `conn -save pdb_lab -savepwd`.",
        "Copia el bloque JSON de la pestaña '3. Conexión SQLcl MCP' abajo.",
        "Pega el Prompt y pide a la IA revisar tu script antes de ejecutarlo."
      ]
    },
    {
      id: "sandbox-cli-git",
      agent: "Codex CLI / Gemini CLI",
      harness: "Carpeta local + Revisión en Git (sin conexión a Oracle)",
      isolation: "La IA no toca la base de datos: solo edita archivos .sql y .rman para que un humano los revise",
      bestFor: "Equipos que suben cambios a GitHub y revisan Pull Requests antes de pasar a producción",
      maxRisk: "Alto (siempre revisado por una persona)",
      summary: "Separa escribir el script de ejecutarlo: la IA genera el código y un compañero o DBA lo revisa antes de correrlo.",
      whyItWorks: "Hace imposible que un error o alucinación de la IA borre tablas reales por accidente.",
      steps: [
        "Copia las reglas de '2. Reglas AGENTS.md' en la raíz de tu repositorio Git.",
        "Pide al agente editar únicamente archivos `.sql` en una rama nueva.",
        "Revisa el Pull Request y ejecuta el script manualmente o desde tu pipeline CI."
      ]
    },
    {
      id: "docker-pdb-ephemeral",
      agent: "Agente CLI en contenedor",
      harness: "Oracle Database Free / PDB clonada desechable",
      isolation: "Instancia de pruebas aislada en Docker que puedes borrar y volver a crear en minutos",
      bestFor: "Probar Tablespaces, Datafiles, Redo Logs, checkpoints y respaldos RMAN sin miedo",
      maxRisk: "Crítico (entorno de pruebas 100% desechable)",
      summary: "Si tu script crea archivos físicos (.dbf), rota Redo Logs o usa RMAN, pruébalo primero en una base clonada que puedas romper sin riesgo.",
      whyItWorks: "Te deja practicar comandos reales de administrador y recuperar ante fallos sin afectar datos reales.",
      steps: [
        "Levanta Oracle Database Free en Docker o clona una PDB de pruebas.",
        "Asegura `CONFIGURE CONTROLFILE AUTOBACKUP ON;` si vas a practicar RMAN.",
        "Ejecuta tu script Scratch ahí y observa los cambios con `V$DATAFILE` y `V$LOG`."
      ]
    },
    {
      id: "readonly-observability",
      agent: "Claude Code / Gemini CLI",
      harness: "MCP / SQLcl con usuario Read-Only (Solo SELECT)",
      isolation: "Usuario de Oracle que únicamente puede leer vistas V$ y tablas; tiene prohibido modificar nada",
      bestFor: "Revisar errores en producción, ver cuánto espacio falta o auditar Datafiles y Redo Logs",
      maxRisk: "Bajo (cero riesgo de modificar datos)",
      summary: "Aunque alguien pida cambiar una fila o borrar una tabla, Oracle mismo rechaza el comando con error ORA-01031 por falta de permisos.",
      whyItWorks: "La seguridad vive en la base de datos, no en confiar en que el modelo 'se porte bien'.",
      steps: [
        "Crea un usuario Oracle solo con `CREATE SESSION` y `SELECT_CATALOG_ROLE`.",
        "Conecta tu cliente MCP usando exclusivamente ese perfil de solo lectura.",
        "Pide a la IA diagnosticar con vistas `V$CONTROLFILE`, `V$DATAFILE` y `V$LOG`."
      ]
    },
    {
      id: "template-orchestrator",
      agent: "Asistente guiado por plantillas",
      harness: "Tarjetas o formularios fijos (estilo Scratch)",
      isolation: "La IA solo rellena parámetros permitidos dentro de una lista blanca de comandos",
      bestFor: "Tareas repetitivas de soporte donde no conviene dejar SQL libre",
      maxRisk: "Medio (controlado por plantilla fija)",
      summary: "En lugar de dejar que la IA invente sintaxis SQL desde cero, el sistema la obliga a elegir bloques validados como en este ensamblador Scratch.",
      whyItWorks: "Evita errores de sintaxis, olvidos de cláusula WHERE y comandos peligrosos fuera de catálogo.",
      steps: [
        "Define tus bloques aprobados y sus parámetros mínimos (ej. tabla, tablespace, WHERE).",
        "Usa `AGENTS.md` para obligar a la IA a devolver solo parámetros validados.",
        "Ejecuta la plantilla resultante en SQLcl o guárdala en Git."
      ]
    }
  ];

  var ENV_LABELS = {
    local_pdb: "Mi PC / Docker Oracle Free (Aprendizaje)",
    staging: "Servidor de pruebas / QA con datos enmascarados",
    prod_ro: "Producción (Solo consultar y revisar errores)",
    cicd: "Repositorio Git con revisión en equipo (CI/CD)"
  };

  function recommendForContext(analysis, envKey) {
    var env = envKey || "local_pdb";
    var risk = analysis ? analysis.riskLevel : "low";
    var counts = analysis ? analysis.counts : { total: 0, storage: 0, rman: 0, ddl: 0, dml: 0 };
    var chosenId = "sqlcl-mcp-cli";

    if (env === "prod_ro") {
      chosenId = "readonly-observability";
    } else if (env === "cicd") {
      chosenId = "sandbox-cli-git";
    } else if ((counts.rman > 0 || counts.storage > 0 || risk === "high") && env === "local_pdb") {
      chosenId = "docker-pdb-ephemeral";
    } else if (risk === "high" && env === "staging") {
      chosenId = "sandbox-cli-git";
    } else if (counts.total > 0 && counts.ddl === 0 && counts.dml === 0 && counts.storage === 0 && counts.rman === 0) {
      chosenId = "readonly-observability";
    }

    var primary = AGENTS_CATALOG.filter(function (item) {
      return item.id === chosenId;
    })[0] || AGENTS_CATALOG[0];

    var guardrails = [];
    if (env === "prod_ro" && risk !== "low") {
      guardrails.push("ALERTA DE ENTORNO: Tu script incluye escritura/DDL/RMAN pero elegiste Producción Read-Only. Usa primero una PDB clonada o bloquea todo comando que no sea SELECT.");
    }
    guardrails.push("Usa credenciales almacenadas en Oracle Wallet / variables de entorno; nunca pegues contraseñas SYS o SYSTEM en el prompt.");
    guardrails.push("Exige fijar explícitamente el contenedor (`ALTER SESSION SET CONTAINER`) antes de ejecutar cambios sobre Tablespaces o tablas.");

    if (counts.dml > 0) {
      guardrails.push("Para DML (`INSERT`/`UPDATE`/`DELETE`), configura el harness en modo `autocommit OFF` y valida conteo con `SELECT COUNT(*)` previo.");
    }
    if (counts.ddl > 0 || counts.storage > 0) {
      guardrails.push("Activa aprobación manual por comando (`approval_policy: always-ask`) antes de crear o redimensionar Datafiles.");
    }
    if (counts.rman > 0) {
      guardrails.push("Separa la ejecución SQLcl de `rman target /` y valida `CONFIGURE CONTROLFILE AUTOBACKUP ON` antes de tocar archivos físicos.");
    }
    if (counts.total === 0) {
      guardrails.push("Arma al menos un bloque en el Ensamblador Scratch para generar un diagnóstico específico y un kit de prompt personalizado.");
    }

    var diagnosis = "";
    if (counts.total === 0) {
      diagnosis = "El lienzo Scratch está vacío. Por defecto se recomienda iniciar en una PDB local con SQLcl MCP y usuario de privilegio mínimo.";
    } else if (risk === "high") {
      diagnosis = "Tu script contiene operaciones de alto impacto (DDL destructivo, modificación sin filtro o recuperación RMAN). El agente NO debe ejecutarlas de forma autónoma.";
    } else if (risk === "medium") {
      diagnosis = "Tu script modifica estructura o almacenamiento físico (DDL / Tablespace / Redo / Backup). Requiere sandbox o aprobación humana paso a paso.";
    } else {
      diagnosis = "Tu script es de bajo riesgo (consultas, sesión o transacciones básicas acotadas). Apto para asistencia interactiva con SQLcl MCP.";
    }

    return {
      env: env,
      envLabel: ENV_LABELS[env] || ENV_LABELS.local_pdb,
      primary: primary,
      diagnosis: diagnosis,
      guardrails: guardrails
    };
  }

  function generateKitArtifact(kind, scriptText, rec, analysis) {
    var safeScript = scriptText || "-- (Sin bloques aún en el lienzo)";
    var hasRman = analysis && analysis.hasRman;

    if (kind === "agents_md") {
      return [
        "# AGENTS.md — Política de Harness Oracle para Agente IA",
        "",
        "## Contexto y Entorno",
        "- Entorno autorizado: " + rec.envLabel,
        "- Harness principal: " + rec.primary.harness,
        "- Nivel de riesgo detectado en script activo: " + (analysis ? analysis.riskLevel.toUpperCase() : "LOW"),
        "",
        "## Reglas obligatorias (Guardrails)",
        "1. **Privilegio mínimo:** Conéctate únicamente con el perfil MCP configurado; prohibido usar `SYSDBA` salvo mantenimiento aprobado fuera de línea.",
        "2. **Verificación previa:** Antes de cualquier DDL o cambio de almacenamiento, consulta `V$PDBS`, `V$DATAFILE`, `V$LOG` y `V$CONTROLFILE`.",
        "3. **Confirmación humana (Human-in-the-loop):** Pide aprobación explícita antes de ejecutar `TRUNCATE`, `DROP`, `DELETE`, `ALTER SYSTEM`, `ALTER DATABASE` o comandos `RMAN`.",
        "4. **Transacciones seguras:** Nunca ejecutes `UPDATE` o `DELETE` sin cláusula `WHERE` verificada primero con `SELECT`.",
        hasRman
          ? "5. **Separación RMAN:** Nunca envíes sintaxis RMAN a través de SQLcl/SQL*Plus; genera un archivo `.rman` aparte y solicita ejecución manual con `rman target /`."
          : "5. **Control de errores SQL*Plus:** Mantén `WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK` al inicio de scripts multi-paso."
      ].join("\n");
    }

    if (kind === "mcp_json") {
      return JSON.stringify({
        mcpServers: {
          oracle_sqlcl_lab: {
            command: "sqlcl",
            args: ["-mcp"],
            env: {
              ORACLE_HOME: "/opt/oracle/instantclient",
              TNS_ADMIN: "/opt/oracle/wallet_pdb_lab"
            },
            notes: "Usa conexiones guardadas (`conn -save pdb_lab -savepwd`) para evitar exponer credenciales en prompts. Recomendado: " + rec.primary.agent
          }
        },
        harnessPolicy: {
          environment: rec.env,
          approvalMode: analysis && analysis.riskLevel === "low" ? "on-request" : "always-ask",
          allowDestructiveDdl: false,
          requireDryRunSelectBeforeDml: true
        }
      }, null, 2);
    }

    return [
      "Actúa como DBA Oracle senior operando dentro de un harness seguro (" + rec.primary.harness + ").",
      "Entorno objetivo: " + rec.envLabel + ".",
      "",
      "Tarea:",
      "1. Revisa el siguiente script generado visualmente y verifica sintaxis, orden de ejecución y contenedor PDB.",
      "2. Antes de proponer ejecución, lista qué cambios ocurrirán en Buffer Cache, Redo Log, Datafiles y Control File.",
      "3. NO ejecutes comandos destructivos ni RMAN sin solicitar mi confirmación paso a paso.",
      "",
      "Script a revisar:",
      "```sql",
      safeScript,
      "```"
    ].join("\n");
  }

  global.OraBlock = global.OraBlock || {};
  global.OraBlock.Agents = {
    AGENTS_CATALOG: AGENTS_CATALOG,
    recommendForContext: recommendForContext,
    generateKitArtifact: generateKitArtifact
  };
})(window);
