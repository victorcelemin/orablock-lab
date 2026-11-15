(function (global) {
  "use strict";

  function createInitialSimState() {
    return {
      scn: 410200,
      checkpointScn: 410200,
      datafileHeaderScn: 410200,
      logSeq: 42,
      activeGroup: 1,
      dbState: "OPEN",
      ramSaldo: 500,
      diskSaldo: 500,
      uncommittedValue: null,
      committedInRedo: null,
      hadUncommittedAtCrash: false,
      uncommittedLostValue: null,
      dirtyBuffer: false,
      logBufferPending: false,
      suggestedNext: "dml",
      activeHighlight: [],
      redoGroups: [
        { group: 1, seq: 42, status: "CURRENT", entries: "SCN 410200 (sincronizado)" },
        { group: 2, seq: 41, status: "INACTIVE", entries: "Respaldado / reutilizable" }
      ],
      explanation: "<strong>Estado inicial equilibrado:</strong> Todos los archivos coinciden en el SCN 410200 y el saldo guardado es <strong>500</strong>. Pulsa el botón resaltado <strong>1. Insertar dato (Sin COMMIT)</strong> para empezar."
    };
  }

  function applySimStep(state, action) {
    var s = JSON.parse(JSON.stringify(state));
    s.activeHighlight = [];

    if (action === "dml") {
      if (s.dbState !== "OPEN") {
        s.suggestedNext = "recover";
        s.explanation = "<strong>Instancia caída:</strong> La memoria RAM está apagada. Pulsa primero <strong>6. Recuperar al encender (SMON)</strong> o <strong>Reiniciar ejemplo</strong>.";
        return s;
      }
      var base = s.ramSaldo !== null ? s.ramSaldo : s.diskSaldo;
      var nextVal = base + 150;
      s.scn += 1;
      s.uncommittedValue = nextVal;
      s.ramSaldo = nextVal;
      s.dirtyBuffer = true;
      s.logBufferPending = true;
      s.suggestedNext = "commit";
      s.activeHighlight = ["buffer", "logbuf"];
      s.explanation = "<strong>Paso 1 · Cambio en memoria (Sin COMMIT):</strong> En RAM (Buffer Cache), el saldo pasa de " + base + " a <strong>" + nextVal + "</strong>, pero el disco (<code>users_01.dbf</code>) sigue en <strong>" + s.diskSaldo + "</strong>. Si se cortara la luz ahora mismo, este cambio de " + nextVal + " se perdería.";
      return s;
    }

    if (action === "commit") {
      if (s.dbState !== "OPEN") {
        s.suggestedNext = "recover";
        s.explanation = "<strong>Instancia caída:</strong> No puedes confirmar cambios con la base apagada. Ejecuta el paso <strong>6. Recuperar</strong> primero.";
        return s;
      }
      if (s.uncommittedValue === null && !s.logBufferPending) {
        var autoBase = s.ramSaldo !== null ? s.ramSaldo : s.diskSaldo;
        s.scn += 1;
        s.ramSaldo = autoBase + 150;
        s.uncommittedValue = s.ramSaldo;
        s.dirtyBuffer = true;
      }
      s.scn += 1;
      s.committedInRedo = s.ramSaldo;
      s.uncommittedValue = null;
      s.logBufferPending = false;
      s.suggestedNext = "dbwn";
      s.redoGroups = s.redoGroups.map(function (g) {
        if (g.group === s.activeGroup) {
          g.entries = "COMMIT Saldo=" + s.committedInRedo + " (SCN " + s.scn + ")";
        }
        return g;
      });
      s.activeHighlight = ["logbuf", "lgwr", "redolog"];
      s.explanation = "<strong>Paso 2 · COMMIT guardado en Redo Log:</strong> El proceso <strong>LGWR</strong> copia de inmediato tu confirmación (<strong>Saldo=" + s.committedInRedo + "</strong>) al archivo físico <strong>Online Redo Log</strong> (SCN " + s.scn + "). Aunque el Datafile todavía muestre " + s.diskSaldo + ", tu dato ya está a salvo ante apagones.";
      return s;
    }

    if (action === "dbwn") {
      if (s.dbState !== "OPEN") {
        s.suggestedNext = "recover";
        s.explanation = "<strong>Instancia caída:</strong> La memoria RAM se perdió; primero ejecuta <strong>6. Recuperar</strong>.";
        return s;
      }
      if (!s.dirtyBuffer) {
        s.suggestedNext = "dml";
        s.explanation = "<strong>Todo ya está copiado al Datafile:</strong> El Buffer Cache en RAM coincide con el Datafile en disco (Saldo = " + s.diskSaldo + "). Ejecuta el paso 1 para probar otro cambio.";
        return s;
      }
      s.diskSaldo = s.ramSaldo;
      s.dirtyBuffer = false;
      s.suggestedNext = "checkpoint";
      s.activeHighlight = ["buffer", "dbwn", "datafile"];
      s.explanation = "<strong>Paso 3 · DBWn copia el cambio al Datafile:</strong> El escritor <strong>DBWn</strong> guarda el bloque modificado desde la RAM hasta <code>users_01.dbf</code> (ahora disco = <strong>" + s.diskSaldo + "</strong>). Solo falta actualizar las firmas SCN en el Control File con un Checkpoint.";
      return s;
    }

    if (action === "checkpoint") {
      if (s.dbState !== "OPEN") {
        s.suggestedNext = "recover";
        s.explanation = "<strong>Instancia caída:</strong> Ejecuta el paso <strong>6. Recuperar</strong> primero.";
        return s;
      }
      s.scn += 1;
      s.logSeq += 1;
      var prevGroup = s.activeGroup;
      s.activeGroup = s.activeGroup === 1 ? 2 : 1;
      if (s.dirtyBuffer) {
        s.diskSaldo = s.ramSaldo;
        s.dirtyBuffer = false;
      }
      s.checkpointScn = s.scn;
      s.datafileHeaderScn = s.scn;
      s.suggestedNext = "crash";
      s.redoGroups = s.redoGroups.map(function (g) {
        if (g.group === s.activeGroup) {
          g.status = "CURRENT";
          g.seq = s.logSeq;
          g.entries = "Activo para nuevos cambios (SCN " + s.scn + ")";
        } else {
          g.status = "INACTIVE";
          g.entries = "Ya volcado al Datafile (Grupo " + prevGroup + ")";
        }
        return g;
      });
      s.activeHighlight = ["lgwr", "dbwn", "ckpt", "redolog", "datafile", "controlfile"];
      s.explanation = "<strong>Paso 4 · Checkpoint sincronizado (CKPT):</strong> LGWR cambia de libreta al Grupo " + s.activeGroup + " (Turno #" + s.logSeq + "), DBWn termina de vaciar la RAM y <strong>CKPT</strong> sella el mismo reloj <strong>SCN " + s.checkpointScn + "</strong> en los Datafiles y el Control File.";
      return s;
    }

    if (action === "crash") {
      s.dbState = "CRASHED";
      s.hadUncommittedAtCrash = s.uncommittedValue !== null;
      s.uncommittedLostValue = s.uncommittedValue;
      s.dirtyBuffer = false;
      s.logBufferPending = false;
      s.ramSaldo = null;
      s.suggestedNext = "recover";
      s.activeHighlight = ["buffer", "logbuf"];
      var crashExtra = "";
      if (s.committedInRedo !== null && s.diskSaldo !== s.committedInRedo) {
        crashExtra += " Hay un <code>COMMIT</code> confirmado (<strong>Saldo=" + s.committedInRedo + "</strong>) guardado a salvo en el Redo Log aunque el Datafile quedó en " + s.diskSaldo + ".";
      }
      if (s.hadUncommittedAtCrash) {
        crashExtra += " El cambio sin COMMIT (Saldo=" + s.uncommittedLostValue + ") murió con la RAM.";
      }
      s.explanation = "<strong>Paso 5 · Corte eléctrico simulado:</strong> Toda la RAM desapareció al instante." + crashExtra + " Pulsa <strong>6. Recuperar al encender (SMON)</strong> para ver cómo Oracle se repara solo.";
      return s;
    }

    if (action === "recover") {
      if (s.dbState === "OPEN") {
        s.suggestedNext = "dml";
        s.explanation = "<strong>La base ya está abierta (OPEN):</strong> Para probar la recuperación, haz clic en <strong>1. Insertar dato</strong> → <strong>2. COMMIT</strong> → <strong>5. Cortar la luz</strong> y luego vuelve aquí.";
        return s;
      }
      s.dbState = "OPEN";
      var recoveredParts = [];
      if (s.committedInRedo !== null && s.diskSaldo !== s.committedInRedo) {
        s.diskSaldo = s.committedInRedo;
        recoveredParts.push("SMON leyó el <strong>Control File</strong> (Checkpoint SCN " + s.checkpointScn + "), recorrió el <strong>Online Redo Log</strong> hacia adelante (<em>Roll Forward</em>) y rescató al Datafile tu último dato confirmado (<strong>Saldo = " + s.diskSaldo + "</strong>).");
      } else {
        recoveredParts.push("SMON revisó el <strong>Control File</strong> y confirmó que el Datafile ya tenía todos los datos confirmados al día (<strong>Saldo = " + s.diskSaldo + "</strong>).");
      }
      if (s.hadUncommittedAtCrash) {
        recoveredParts.push("Además, descartó el cambio sin confirmar (Saldo=" + s.uncommittedLostValue + ") mediante <em>Roll Back</em> automático para dejar la base coherente.");
      }
      s.ramSaldo = s.diskSaldo;
      s.uncommittedValue = null;
      s.hadUncommittedAtCrash = false;
      s.uncommittedLostValue = null;
      s.checkpointScn = s.scn;
      s.datafileHeaderScn = s.scn;
      s.suggestedNext = "dml";
      s.activeHighlight = ["smon", "controlfile", "redolog", "datafile"];
      s.explanation = "<strong>Paso 6 · Recuperación completada por SMON:</strong> " + recoveredParts.join(" ");
      return s;
    }

    return s;
  }

  var DIDACTIC_DOCS = {
    controlfile: {
      title: "Control File (.ctl) — El mapa maestro de la base",
      analogy: "<strong>En palabras simples:</strong> Es como el índice y la caja negra de tu base de datos. Aunque tus tablas (Datafiles) estén intactas, sin el Control File Oracle no sabe dónde están los archivos ni en qué punto exacto se quedó.",
      points: [
        "<strong>Qué guarda por dentro:</strong> Nombre de la base (<code>DBID</code>), rutas reales de todos tus Datafiles y Redo Logs, el turno de log actual, el <strong>Checkpoint SCN</strong> y la lista de backups RMAN.",
        "<strong>Por qué es tan pequeño pero vital:</strong> Suele pesar apenas 10 MB – 50 MB, pero sin él la instancia no puede pasar del estado <code>NOMOUNT</code> a <code>MOUNT</code>.",
        "<strong>Quién lo mantiene al día:</strong> El proceso <strong>CKPT</strong> actualiza los sellos SCN; también se actualiza cada vez que creas o amplías un Tablespace o Datafile.",
        "<strong>Regla de oro (Multiplexado):</strong> Ten siempre 2 o 3 copias idénticas (<code>control01.ctl</code>, <code>control02.ctl</code>) en discos distintos."
      ],
      queryTitle: "Consulta para ver tus Control Files en Oracle",
      querySql: "SELECT NAME, STATUS, BLOCK_SIZE * FILE_SIZE_BLKS / 1024 / 1024 AS MB FROM V$CONTROLFILE;",
      presetBlocks: [
        { commandId: "select_query", params: { cols: "NAME, STATUS", table: "V$CONTROLFILE", cond: "" } },
        { commandId: "backup_controlfile_trace", params: { path: "/u01/backup/ctl_trace.sql" } }
      ]
    },
    datafile: {
      title: "Datafile (.dbf) — Donde viven tus tablas e índices",
      analogy: "<strong>En palabras simples:</strong> Si un <em>Tablespace</em> es la carpeta lógica (por ejemplo <code>TBS_VENTAS</code>), los <em>Datafiles</em> son los archivos físicos <code>.dbf</code> en tu disco duro donde se guardan las filas.",
      points: [
        "<strong>Cómo se organiza por dentro:</strong> Tablespace (carpeta lógica) → Datafile (<code>.dbf</code> físico) → Tablas/Índices → Bloques de datos (normalmente 8 KB).",
        "<strong>Por qué no cambia en cada INSERT:</strong> Para no frenar el disco, cambias primero en memoria RAM; luego <strong>DBWn</strong> copia los bloques modificados al Datafile en lote.",
        "<strong>Cabecera sincronizada:</strong> Cada Datafile anota en su primer bloque su <strong>Checkpoint SCN</strong>, que debe coincidir con el Control File al arrancar.",
        "<strong>Si se daña uno:</strong> En modo <code>ARCHIVELOG</code>, RMAN restaura ese archivo desde backup y aplica Redo Logs hasta dejarlo exacto."
      ],
      queryTitle: "Consulta para ver Datafiles y su SCN en Oracle",
      querySql: "SELECT FILE#, NAME, STATUS, CHECKPOINT_CHANGE# FROM V$DATAFILE;",
      presetBlocks: [
        { commandId: "select_query", params: { cols: "FILE#, NAME, STATUS, CHECKPOINT_CHANGE#", table: "V$DATAFILE", cond: "" } },
        { commandId: "create_tablespace", params: { tbs: "TBS_PRACTICA", datafile: "/u01/oradata/tbs_practica01.dbf", size: "50M", auto: "ON NEXT 20M MAXSIZE 1G" } }
      ]
    },
    redolog: {
      title: "Online Redo Log (.log) — El diario anti-pérdidas",
      analogy: "<strong>En palabras simples:</strong> Es una libreta de emergencia ultrarrápida: cada vez que pulsas <code>COMMIT</code>, Oracle anota el cambio seguido al final del archivo antes de responderte que se guardó.",
      points: [
        "<strong>Garantía ante apagones (WAL):</strong> Ante cada <code>COMMIT</code>, <strong>LGWR</strong> escribe secuencialmente al Online Redo Log activo en milisegundos, aunque el Datafile aún esté en RAM.",
        "<strong>Funciona en turnos circulares:</strong> Mínimo hay 2 grupos (<code>CURRENT</code>, <code>ACTIVE</code>, <code>INACTIVE</code>). Cuando se llena el grupo 1, ocurre un <em>Log Switch</em> y pasa al grupo 2.",
        "<strong>Copias por seguridad:</strong> Conviene tener al menos 2 archivos miembros por grupo en discos separados.",
        "<strong>Archivo histórico (ARCHIVELOG):</strong> Conviene activarlo para que <code>ARCn</code> respalde cada libreta llena antes de sobrescribirla."
      ],
      queryTitle: "Consulta para ver tus grupos y archivos Redo Log",
      querySql: "SELECT GROUP#, SEQUENCE#, STATUS, ARCHIVED FROM V$LOG;\nSELECT GROUP#, MEMBER, STATUS FROM V$LOGFILE;",
      presetBlocks: [
        { commandId: "select_query", params: { cols: "GROUP#, SEQUENCE#, STATUS, ARCHIVED", table: "V$LOG", cond: "" } },
        { commandId: "switch_logfile", params: {} }
      ]
    },
    comparison: {
      title: "Resumen rápido: qué ocurre si se daña cada archivo",
      analogy: "<strong>Regla para recordarlo siempre:</strong> Redo Log protege lo recién confirmado; Datafile guarda las tablas acumuladas; Control File sabe qué archivos hay y cuál está sincronizado.",
      points: [
        "<strong>Si se daña un Datafile (con ARCHIVELOG):</strong> Se puede restaurar solo ese archivo con RMAN (<code>RESTORE/RECOVER DATAFILE</code>) y aplicar Redo Logs.",
        "<strong>Si se daña 1 miembro de Redo Log multiplexado:</strong> La base sigue funcionando usando el miembro espejo del mismo grupo.",
        "<strong>Si pierdes TODO el grupo CURRENT del Redo Log:</strong> Riesgo de perder transacciones recientes que aún no bajaron al Datafile.",
        "<strong>Si pierdes TODAS las copias del Control File:</strong> La base se detiene; debes restaurarlo con <code>CONTROLFILE AUTOBACKUP</code> o reconstruirlo desde el trace SQL."
      ],
      queryTitle: "Secuencia recomendada de respaldo preventivo",
      querySql: "CONFIGURE CONTROLFILE AUTOBACKUP ON;\nBACKUP DATABASE PLUS ARCHIVELOG;\nALTER DATABASE BACKUP CONTROLFILE TO TRACE;",
      presetBlocks: [
        { commandId: "rman_autobackup", params: {} },
        { commandId: "rman_backup_db", params: {} },
        { commandId: "backup_controlfile_trace", params: { path: "/u01/backup/ctl_trace.sql" } }
      ]
    }
  };

  global.OraBlock = global.OraBlock || {};
  global.OraBlock.Storage = {
    createInitialSimState: createInitialSimState,
    applySimStep: applySimStep,
    DIDACTIC_DOCS: DIDACTIC_DOCS
  };
})(window);
