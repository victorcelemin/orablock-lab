(function (global) {
  "use strict";

  var CATEGORIES = {
    session: { id: "session", label: "Sesión", theme: "theme-session" },
    ddl: { id: "ddl", label: "DDL", theme: "theme-ddl" },
    dml: { id: "dml", label: "DML", theme: "theme-dml" },
    storage: { id: "storage", label: "Disco", theme: "theme-storage" },
    plsql: { id: "plsql", label: "PL/SQL", theme: "theme-plsql" },
    rman: { id: "rman", label: "RMAN", theme: "theme-rman" }
  };

  function safeIdent(val, fallback) {
    var clean = String(val || "").trim();
    return clean || fallback;
  }

  function escapeSqlString(val) {
    return String(val || "").replace(/'/g, "''");
  }

  var COMMANDS = [
    {
      id: "alter_container",
      category: "session",
      title: "Cambiar a PDB",
      kind: "sql",
      risk: "low",
      storageEffect: "none",
      impactTag: "Elige BD (PDB)",
      syntaxPreview: "ALTER SESSION SET CONTAINER = ...",
      hint: "Selecciona en qué base conectada (PDB) se ejecutarán los siguientes comandos.",
      fields: [
        { key: "pdb", label: "PDB", type: "text", default: "ORCLPDB1" }
      ],
      render: function (p) {
        return ["ALTER SESSION SET CONTAINER = " + safeIdent(p.pdb, "ORCLPDB1") + ";"];
      }
    },
    {
      id: "set_serveroutput",
      category: "session",
      title: "Activar salida PL/SQL",
      kind: "sql",
      risk: "low",
      storageEffect: "none",
      impactTag: "Ver mensajes",
      syntaxPreview: "SET SERVEROUTPUT ON",
      hint: "Permite ver en pantalla los mensajes que imprima un bloque PL/SQL.",
      fields: [
        { key: "mode", label: "Estado", type: "select", options: ["ON", "OFF"], default: "ON" }
      ],
      render: function (p) {
        return ["SET SERVEROUTPUT " + safeIdent(p.mode, "ON") + " SIZE UNLIMITED"];
      }
    },
    {
      id: "whenever_error",
      category: "session",
      title: "Detener ante error SQL",
      kind: "sql",
      risk: "low",
      storageEffect: "none",
      impactTag: "Freno seguro",
      syntaxPreview: "WHENEVER SQLERROR EXIT ...",
      hint: "Si ocurre un error, detiene el script de golpe y deshace cambios sin guardar.",
      fields: [
        { key: "action", label: "Al fallar", type: "select", options: ["ROLLBACK", "COMMIT"], default: "ROLLBACK" }
      ],
      render: function (p) {
        return ["WHENEVER SQLERROR EXIT SQL.SQLCODE " + safeIdent(p.action, "ROLLBACK")];
      }
    },
    {
      id: "prompt_msg",
      category: "session",
      title: "Imprimir mensaje PROMPT",
      kind: "sql",
      risk: "low",
      storageEffect: "none",
      impactTag: "Solo texto",
      syntaxPreview: "PROMPT Texto de traza",
      hint: "Muestra un aviso en pantalla para seguir el avance del script.",
      fields: [
        { key: "msg", label: "Mensaje", type: "text", default: "Iniciando despliegue de esquema", wide: true }
      ],
      render: function (p) {
        return ["PROMPT " + safeIdent(p.msg, "Paso completado")];
      }
    },
    {
      id: "savepoint",
      category: "session",
      title: "Crear SAVEPOINT",
      kind: "sql",
      risk: "low",
      storageEffect: "dml",
      impactTag: "Marca temporal",
      syntaxPreview: "SAVEPOINT nombre;",
      hint: "Crea un punto de guardado temporal para poder deshacer solo una parte sin perder todo.",
      fields: [
        { key: "name", label: "Marca", type: "text", default: "SP_ANTES_CARGA" }
      ],
      render: function (p) {
        return ["SAVEPOINT " + safeIdent(p.name, "SP_PUNTO1") + ";"];
      }
    },
    {
      id: "create_table",
      category: "ddl",
      title: "Crear Tabla",
      kind: "sql",
      risk: "medium",
      storageEffect: "datafile",
      impactTag: "Usa Datafile",
      syntaxPreview: "CREATE TABLE ... TABLESPACE ...",
      hint: "Crea una tabla nueva y le reserva espacio físico dentro del Tablespace elegido.",
      fields: [
        { key: "table", label: "Tabla", type: "text", default: "VENTAS_REG" },
        { key: "col1", label: "PK", type: "text", default: "ID_VENTA" },
        { key: "col2", label: "Columna", type: "text", default: "MONTO NUMBER(10,2)" },
        { key: "tbs", label: "Tablespace", type: "text", default: "TBS_VENTAS" }
      ],
      render: function (p) {
        return [
          "CREATE TABLE " + safeIdent(p.table, "VENTAS_REG") + " (",
          "  " + safeIdent(p.col1, "ID_VENTA") + " NUMBER PRIMARY KEY,",
          "  " + safeIdent(p.col2, "MONTO NUMBER(10,2)"),
          ") TABLESPACE " + safeIdent(p.tbs, "USERS") + ";"
        ];
      }
    },
    {
      id: "alter_table_add",
      category: "ddl",
      title: "Agregar columna a Tabla",
      kind: "sql",
      risk: "medium",
      storageEffect: "none",
      impactTag: "Cambia tabla",
      syntaxPreview: "ALTER TABLE ... ADD (...)",
      hint: "Añade una columna nueva a la tabla. Ojo: todo cambio de estructura hace COMMIT automático.",
      fields: [
        { key: "table", label: "Tabla", type: "text", default: "VENTAS_REG" },
        { key: "col", label: "Columna", type: "text", default: "FECHA_REG DATE DEFAULT SYSDATE", wide: true }
      ],
      render: function (p) {
        return ["ALTER TABLE " + safeIdent(p.table, "VENTAS_REG") + " ADD (" + safeIdent(p.col, "NOTA VARCHAR2(80)") + ");"];
      }
    },
    {
      id: "create_index",
      category: "ddl",
      title: "Crear Índice",
      kind: "sql",
      risk: "medium",
      storageEffect: "datafile",
      impactTag: "Usa Datafile",
      syntaxPreview: "CREATE INDEX ... ON ... (...)",
      hint: "Crea un índice rápido para acelerar búsquedas en el tablespace indicado.",
      fields: [
        { key: "idx", label: "Índice", type: "text", default: "IDX_VENTAS_FECHA" },
        { key: "table", label: "Tabla", type: "text", default: "VENTAS_REG" },
        { key: "col", label: "Columna", type: "text", default: "FECHA_REG" },
        { key: "tbs", label: "Tablespace", type: "text", default: "TBS_VENTAS" }
      ],
      render: function (p) {
        return [
          "CREATE INDEX " + safeIdent(p.idx, "IDX_TABLA") +
          " ON " + safeIdent(p.table, "VENTAS_REG") +
          " (" + safeIdent(p.col, "ID_VENTA") + ") TABLESPACE " + safeIdent(p.tbs, "USERS") + ";"
        ];
      }
    },
    {
      id: "truncate_table",
      category: "ddl",
      title: "Truncar Tabla (Irreversible)",
      kind: "sql",
      risk: "high",
      storageEffect: "datafile",
      impactTag: "Borra sin Undo",
      syntaxPreview: "TRUNCATE TABLE ...",
      hint: "Vacía la tabla completa en segundos sin poder hacer ROLLBACK. Úsalo con cuidado.",
      fields: [
        { key: "table", label: "Tabla", type: "text", default: "TMP_CARGA" }
      ],
      render: function (p) {
        return ["TRUNCATE TABLE " + safeIdent(p.table, "TMP_CARGA") + ";"];
      }
    },
    {
      id: "select_query",
      category: "dml",
      title: "Consultar SELECT",
      kind: "sql",
      risk: "low",
      storageEffect: "none",
      impactTag: "Solo lectura",
      syntaxPreview: "SELECT ... FROM ... WHERE ...",
      hint: "Lee información sin modificar discos ni bloquear tablas de otros usuarios.",
      fields: [
        { key: "cols", label: "Columnas", type: "text", default: "FILE#, NAME, STATUS" },
        { key: "table", label: "Origen", type: "text", default: "V$DATAFILE" },
        { key: "cond", label: "WHERE", type: "text", default: "1 = 1" }
      ],
      render: function (p) {
        var cond = String(p.cond || "").trim();
        var whereClause = cond && cond !== "1 = 1" ? " WHERE " + cond : "";
        return ["SELECT " + safeIdent(p.cols, "*") + " FROM " + safeIdent(p.table, "DUAL") + whereClause + ";"];
      }
    },
    {
      id: "insert_row",
      category: "dml",
      title: "Insertar fila (INSERT)",
      kind: "sql",
      risk: "low",
      storageEffect: "dml",
      impactTag: "RAM + Redo",
      syntaxPreview: "INSERT INTO ... VALUES (...)",
      hint: "Cambia el dato en memoria RAM y lo anota en borrador; aún necesita COMMIT para quedar firme.",
      fields: [
        { key: "table", label: "Tabla", type: "text", default: "VENTAS_REG" },
        { key: "cols", label: "Columnas", type: "text", default: "ID_VENTA, MONTO" },
        { key: "vals", label: "Valores", type: "text", default: "101, 450.00" }
      ],
      render: function (p) {
        return [
          "INSERT INTO " + safeIdent(p.table, "VENTAS_REG") +
          " (" + safeIdent(p.cols, "ID_VENTA, MONTO") + ") VALUES (" + safeIdent(p.vals, "1, 100") + ");"
        ];
      }
    },
    {
      id: "update_row",
      category: "dml",
      title: "Actualizar filas (UPDATE)",
      kind: "sql",
      risk: "medium",
      storageEffect: "dml",
      impactTag: "Undo + Redo",
      syntaxPreview: "UPDATE ... SET ... WHERE ...",
      hint: "Modifica filas existentes guardando copia anterior (Undo) por si decides revertir con ROLLBACK.",
      fields: [
        { key: "table", label: "Tabla", type: "text", default: "VENTAS_REG" },
        { key: "assign", label: "SET", type: "text", default: "MONTO = MONTO * 1.10" },
        { key: "cond", label: "WHERE", type: "text", default: "ID_VENTA = 101" }
      ],
      render: function (p) {
        var cond = String(p.cond || "").trim();
        return [
          "UPDATE " + safeIdent(p.table, "VENTAS_REG") +
          " SET " + safeIdent(p.assign, "MONTO = 0") +
          (cond ? " WHERE " + cond : "") + ";"
        ];
      }
    },
    {
      id: "delete_row",
      category: "dml",
      title: "Eliminar filas (DELETE)",
      kind: "sql",
      risk: "high",
      storageEffect: "dml",
      impactTag: "Alto riesgo",
      syntaxPreview: "DELETE FROM ... WHERE ...",
      hint: "Elimina filas según tu filtro WHERE. Si lo dejas vacío borrarás toda la tabla.",
      fields: [
        { key: "table", label: "Tabla", type: "text", default: "VENTAS_REG" },
        { key: "cond", label: "WHERE", type: "text", default: "ID_VENTA = 101" }
      ],
      render: function (p) {
        var cond = String(p.cond || "").trim();
        return ["DELETE FROM " + safeIdent(p.table, "VENTAS_REG") + (cond ? " WHERE " + cond : "") + ";"];
      }
    },
    {
      id: "commit_tx",
      category: "dml",
      title: "Confirmar Transacción (COMMIT)",
      kind: "sql",
      risk: "low",
      storageEffect: "commit",
      impactTag: "Graba Redo Log",
      syntaxPreview: "COMMIT;",
      hint: "Sella la transacción: LGWR escribe el cambio al instante en el Online Redo Log del disco.",
      fields: [],
      render: function () {
        return ["COMMIT;"];
      }
    },
    {
      id: "rollback_tx",
      category: "dml",
      title: "Revertir Transacción (ROLLBACK)",
      kind: "sql",
      risk: "low",
      storageEffect: "none",
      impactTag: "Deshace RAM",
      syntaxPreview: "ROLLBACK [TO SAVEPOINT];",
      hint: "Cancela cambios no confirmados (todo el trabajo o solo hasta el SAVEPOINT indicado).",
      fields: [
        { key: "sp", label: "Savepoint (opcional)", type: "text", default: "" }
      ],
      render: function (p) {
        var sp = String(p.sp || "").trim();
        return [sp ? "ROLLBACK TO " + sp + ";" : "ROLLBACK;"];
      }
    },
    {
      id: "create_tablespace",
      category: "storage",
      title: "Crear Tablespace + Datafile",
      kind: "sql",
      risk: "medium",
      storageEffect: "datafile",
      impactTag: "Crea .dbf + .ctl",
      syntaxPreview: "CREATE TABLESPACE ... DATAFILE '...' SIZE ...",
      hint: "Crea un archivo físico .dbf en disco para guardar datos y lo anota en el Control File.",
      fields: [
        { key: "tbs", label: "Tablespace", type: "text", default: "TBS_VENTAS" },
        { key: "datafile", label: "Datafile", type: "text", default: "/u01/oradata/tbs_ventas01.dbf", wide: true },
        { key: "size", label: "SIZE", type: "text", default: "100M" },
        { key: "auto", label: "Autoextend", type: "select", options: ["ON NEXT 20M MAXSIZE 1G", "OFF"], default: "ON NEXT 20M MAXSIZE 1G" }
      ],
      render: function (p) {
        return [
          "CREATE TABLESPACE " + safeIdent(p.tbs, "TBS_DATA"),
          "  DATAFILE '" + escapeSqlString(safeIdent(p.datafile, "/u01/oradata/tbs_data01.dbf")) + "'",
          "  SIZE " + safeIdent(p.size, "100M") + " AUTOEXTEND " + safeIdent(p.auto, "ON") + ";"
        ];
      }
    },
    {
      id: "add_datafile",
      category: "storage",
      title: "Agregar Datafile a Tablespace",
      kind: "sql",
      risk: "medium",
      storageEffect: "datafile",
      impactTag: "Amplía .dbf",
      syntaxPreview: "ALTER TABLESPACE ... ADD DATAFILE ...",
      hint: "Añade un nuevo archivo físico .dbf cuando el espacio actual necesita crecer.",
      fields: [
        { key: "tbs", label: "Tablespace", type: "text", default: "TBS_VENTAS" },
        { key: "datafile", label: "Nuevo .dbf", type: "text", default: "/u01/oradata/tbs_ventas02.dbf", wide: true },
        { key: "size", label: "SIZE", type: "text", default: "100M" }
      ],
      render: function (p) {
        return [
          "ALTER TABLESPACE " + safeIdent(p.tbs, "TBS_VENTAS") +
          " ADD DATAFILE '" + escapeSqlString(safeIdent(p.datafile, "/u01/oradata/tbs_ventas02.dbf")) + "' SIZE " + safeIdent(p.size, "100M") + ";"
        ];
      }
    },
    {
      id: "switch_logfile",
      category: "storage",
      title: "Rotar Online Redo Log",
      kind: "sql",
      risk: "medium",
      storageEffect: "checkpoint",
      impactTag: "Rota Redo Log",
      syntaxPreview: "ALTER SYSTEM SWITCH LOGFILE;",
      hint: "Cambia el turno de escritura del Redo Log al siguiente grupo circular y dispara guardado.",
      fields: [],
      render: function () {
        return ["ALTER SYSTEM SWITCH LOGFILE;"];
      }
    },
    {
      id: "system_checkpoint",
      category: "storage",
      title: "Forzar Checkpoint Global",
      kind: "sql",
      risk: "medium",
      storageEffect: "checkpoint",
      impactTag: "Sella .ctl + .dbf",
      syntaxPreview: "ALTER SYSTEM CHECKPOINT;",
      hint: "Sincroniza RAM y disco: DBWn guarda bloques y CKPT actualiza el SCN en Control File y Datafiles.",
      fields: [],
      render: function () {
        return ["ALTER SYSTEM CHECKPOINT;"];
      }
    },
    {
      id: "backup_controlfile_trace",
      category: "storage",
      title: "Respaldar Controlfile a Trace",
      kind: "sql",
      risk: "low",
      storageEffect: "controlfile",
      impactTag: "Copia .ctl SQL",
      syntaxPreview: "ALTER DATABASE BACKUP CONTROLFILE TO TRACE",
      hint: "Genera un archivo de texto con comandos para poder reconstruir el Control File si se daña.",
      fields: [
        { key: "path", label: "Archivo SQL", type: "text", default: "/u01/backup/create_ctl.sql", wide: true }
      ],
      render: function (p) {
        return ["ALTER DATABASE BACKUP CONTROLFILE TO TRACE AS '" + escapeSqlString(safeIdent(p.path, "/tmp/ctl_trace.sql")) + "';"];
      }
    },
    {
      id: "plsql_block",
      category: "plsql",
      title: "Bloque PL/SQL (BEGIN ... END)",
      kind: "cblock",
      risk: "low",
      storageEffect: "none",
      impactTag: "Contenedor C",
      syntaxPreview: "DECLARE ... BEGIN [bloques] EXCEPTION ... END;",
      hint: "Caja Scratch C: mete aquí comandos que deban ejecutarse juntos y capturar errores.",
      fields: [
        { key: "varDecl", label: "Variable", type: "text", default: "v_estado VARCHAR2(40) := 'OK';" }
      ],
      renderHead: function (p) {
        return [
          "DECLARE",
          "  " + safeIdent(p.varDecl, "v_estado VARCHAR2(40) := 'OK';"),
          "BEGIN"
        ];
      },
      renderFoot: function () {
        return [
          "EXCEPTION",
          "  WHEN OTHERS THEN",
          "    DBMS_OUTPUT.PUT_LINE('Error PL/SQL: ' || SQLERRM);",
          "    RAISE;",
          "END;",
          "/"
        ];
      }
    },
    {
      id: "plsql_loop",
      category: "plsql",
      title: "Bucle FOR PL/SQL",
      kind: "cblock",
      risk: "low",
      storageEffect: "dml",
      impactTag: "Bucle Scratch C",
      syntaxPreview: "FOR i IN 1..N LOOP [bloques] END LOOP;",
      hint: "Caja Scratch C: repite todo lo que metas dentro el número de veces que indiques.",
      fields: [
        { key: "varName", label: "Índice", type: "text", default: "i" },
        { key: "limit", label: "Hasta", type: "text", default: "5" }
      ],
      renderHead: function (p) {
        return ["FOR " + safeIdent(p.varName, "i") + " IN 1.." + safeIdent(p.limit, "5") + " LOOP"];
      },
      renderFoot: function () {
        return ["END LOOP;"];
      }
    },
    {
      id: "dbms_output",
      category: "plsql",
      title: "Imprimir en DBMS_OUTPUT",
      kind: "sql",
      risk: "low",
      storageEffect: "none",
      impactTag: "Imprime texto",
      syntaxPreview: "DBMS_OUTPUT.PUT_LINE('...');",
      hint: "Muestra un mensaje desde dentro de un bloque PL/SQL (requiere estar dentro de BEGIN...END).",
      fields: [
        { key: "text", label: "Texto", type: "text", default: "Lote procesado correctamente", wide: true }
      ],
      render: function (p) {
        return ["DBMS_OUTPUT.PUT_LINE('" + escapeSqlString(safeIdent(p.text, "OK")) + "');"];
      }
    },
    {
      id: "rman_autobackup",
      category: "rman",
      title: "RMAN: Autobackup Controlfile",
      kind: "rman",
      risk: "low",
      storageEffect: "controlfile",
      impactTag: "Protege .ctl",
      syntaxPreview: "CONFIGURE CONTROLFILE AUTOBACKUP ON;",
      hint: "Hace que RMAN guarde automáticamente una copia de seguridad del Control File tras cada backup.",
      fields: [],
      render: function () {
        return ["CONFIGURE CONTROLFILE AUTOBACKUP ON;"];
      }
    },
    {
      id: "rman_backup_db",
      category: "rman",
      title: "RMAN: Respaldo Database + Archivelog",
      kind: "rman",
      risk: "medium",
      storageEffect: "datafile",
      impactTag: "Backup total",
      syntaxPreview: "BACKUP DATABASE PLUS ARCHIVELOG;",
      hint: "Respalda todos los Datafiles y los registros Redo archivados para recuperar ante fallos graves.",
      fields: [],
      render: function () {
        return ["BACKUP DATABASE PLUS ARCHIVELOG;"];
      }
    },
    {
      id: "rman_backup_ctrl",
      category: "rman",
      title: "RMAN: Backup Controlfile",
      kind: "rman",
      risk: "low",
      storageEffect: "controlfile",
      impactTag: "Backup binario .ctl",
      syntaxPreview: "BACKUP CURRENT CONTROLFILE FORMAT '...';",
      hint: "Guarda una copia binaria exacta del Control File actual en la ruta indicada.",
      fields: [
        { key: "path", label: "Ruta", type: "text", default: "/u01/backup/ctl_%U.bkp", wide: true }
      ],
      render: function (p) {
        return ["BACKUP CURRENT CONTROLFILE FORMAT '" + escapeSqlString(safeIdent(p.path, "/u01/backup/ctl_%U.bkp")) + "';"];
      }
    },
    {
      id: "rman_recover_db",
      category: "rman",
      title: "RMAN: Restore + Recover Database",
      kind: "rman",
      risk: "high",
      storageEffect: "checkpoint",
      impactTag: "Restaura BD",
      syntaxPreview: "RESTORE DATABASE; RECOVER DATABASE;",
      hint: "Operación de rescate: restaura backups dañados y aplica Redo Logs hasta dejar la base al día.",
      fields: [],
      render: function () {
        return ["RESTORE DATABASE;", "RECOVER DATABASE;"];
      }
    }
  ];

  var COMMAND_MAP = {};
  COMMANDS.forEach(function (cmd) {
    COMMAND_MAP[cmd.id] = cmd;
  });

  function createBlockInstance(commandId, overrides) {
    var def = COMMAND_MAP[commandId];
    if (!def) return null;
    var params = {};
    (def.fields || []).forEach(function (f) {
      params[f.key] = overrides && overrides[f.key] !== undefined ? overrides[f.key] : f.default;
    });
    return {
      uid: "blk_" + Math.random().toString(36).slice(2, 9),
      commandId: commandId,
      params: params,
      children: def.kind === "cblock" ? [] : undefined
    };
  }

  var PRESETS = {
    tablespace_tx: function () {
      return [
        createBlockInstance("whenever_error", { action: "ROLLBACK" }),
        createBlockInstance("alter_container", { pdb: "ORCLPDB1" }),
        createBlockInstance("create_tablespace", {
          tbs: "TBS_VENTAS",
          datafile: "/u01/oradata/tbs_ventas01.dbf",
          size: "100M"
        }),
        createBlockInstance("create_table", {
          table: "VENTAS_REG",
          col1: "ID_VENTA",
          col2: "MONTO NUMBER(10,2)",
          tbs: "TBS_VENTAS"
        }),
        createBlockInstance("insert_row", { table: "VENTAS_REG", cols: "ID_VENTA, MONTO", vals: "101, 450.00" }),
        createBlockInstance("commit_tx"),
        createBlockInstance("system_checkpoint")
      ];
    },
    plsql_savepoint: function () {
      var loopBlk = createBlockInstance("plsql_loop", { varName: "i", limit: "3" });
      loopBlk.children = [
        createBlockInstance("insert_row", { table: "VENTAS_REG", cols: "ID_VENTA, MONTO", vals: "200 + i, 125 * i" })
      ];
      var plsqlBlk = createBlockInstance("plsql_block", { varDecl: "v_lote VARCHAR2(30) := 'LOTE_01';" });
      plsqlBlk.children = [
        createBlockInstance("savepoint", { name: "SP_INICIO" }),
        loopBlk,
        createBlockInstance("dbms_output", { text: "Lote procesado correctamente con SAVEPOINT" }),
        createBlockInstance("commit_tx")
      ];
      return [
        createBlockInstance("set_serveroutput", { mode: "ON" }),
        createBlockInstance("alter_container", { pdb: "ORCLPDB1" }),
        plsqlBlk
      ];
    },
    redo_rman: function () {
      return [
        createBlockInstance("prompt_msg", { msg: "Rotando Redo Log y forzando Checkpoint antes de respaldar" }),
        createBlockInstance("switch_logfile"),
        createBlockInstance("system_checkpoint"),
        createBlockInstance("backup_controlfile_trace", { path: "/u01/backup/ctl_recreate.sql" }),
        createBlockInstance("rman_autobackup"),
        createBlockInstance("rman_backup_ctrl", { path: "/u01/backup/ctl_%U.bkp" })
      ];
    },
    storage_views: function () {
      return [
        createBlockInstance("select_query", { cols: "NAME, STATUS", table: "V$CONTROLFILE", cond: "" }),
        createBlockInstance("select_query", { cols: "FILE#, NAME, CHECKPOINT_CHANGE#, STATUS", table: "V$DATAFILE", cond: "" }),
        createBlockInstance("select_query", { cols: "GROUP#, SEQUENCE#, BYTES/1024/1024 AS MB, STATUS", table: "V$LOG", cond: "" }),
        createBlockInstance("select_query", { cols: "GROUP#, MEMBER, TYPE", table: "V$LOGFILE", cond: "" })
      ];
    }
  };

  function flattenBlocks(blocks, depth, out) {
    depth = depth || 0;
    out = out || [];
    (blocks || []).forEach(function (blk) {
      var def = COMMAND_MAP[blk.commandId];
      if (!def) return;
      out.push({ blk: blk, def: def, depth: depth });
      if (def.kind === "cblock" && Array.isArray(blk.children)) {
        flattenBlocks(blk.children, depth + 1, out);
      }
    });
    return out;
  }

  function renderLines(blocks, outputMode, indentStr) {
    indentStr = indentStr || "";
    var lines = [];
    (blocks || []).forEach(function (blk) {
      var def = COMMAND_MAP[blk.commandId];
      if (!def) return;

      if (outputMode === "rman" && def.kind !== "rman") {
        if (def.kind === "cblock" && Array.isArray(blk.children)) {
          lines = lines.concat(renderLines(blk.children, outputMode, indentStr));
        }
        return;
      }

      if (def.kind === "cblock") {
        if (outputMode === "sql") {
          def.renderHead(blk.params).forEach(function (l) {
            lines.push(indentStr + l);
          });
          var inner = renderLines(blk.children || [], outputMode, indentStr + "  ");
          if (inner.length === 0) {
            lines.push(indentStr + "  NULL;");
          } else {
            lines = lines.concat(inner);
          }
          def.renderFoot(blk.params).forEach(function (l) {
            lines.push(indentStr + l);
          });
        }
        return;
      }

      if (outputMode === "sql" && def.kind === "rman") {
        def.render(blk.params).forEach(function (l) {
          lines.push(indentStr + "-- [Ejecutar en RMAN] " + l);
        });
        return;
      }

      def.render(blk.params).forEach(function (l) {
        lines.push(indentStr + l);
      });
    });
    return lines;
  }

  function buildScript(blocks, outputMode) {
    var mode = outputMode === "rman" ? "rman" : "sql";
    var bodyLines = renderLines(blocks, mode, "");
    if (!blocks || blocks.length === 0) {
      return mode === "rman"
        ? "-- Agrega tarjetas RMAN para generar comandos de respaldo o recuperación."
        : "-- Arrastra o haz clic en las tarjetas de la izquierda para construir tu script Oracle.";
    }
    if (mode === "rman" && bodyLines.length === 0) {
      return "-- El lienzo actual no contiene tarjetas RMAN.\n-- Agrega bloques rojos de RMAN o cambia a vista SQL / PL-SQL.";
    }
    var header = mode === "rman"
      ? ["-- Script RMAN generado por OraBlock Lab", "-- Conectar con: rman target /"]
      : ["-- Script Oracle SQL / PL-SQL generado por OraBlock Lab"];
    return header.concat(bodyLines).join("\n");
  }

  function analyzeScript(blocks) {
    var flat = flattenBlocks(blocks);
    var counts = { total: flat.length, session: 0, ddl: 0, dml: 0, storage: 0, plsql: 0, rman: 0 };
    var warnings = [];
    var hasUncommittedDml = false;
    var hasBackup = false;
    var hasSql = false;
    var hasRman = false;
    var riskScore = 0;

    flat.forEach(function (entry) {
      var def = entry.def;
      var p = entry.blk.params || {};
      counts[def.category] = (counts[def.category] || 0) + 1;

      if (def.kind === "rman") hasRman = true;
      else hasSql = true;

      if (def.risk === "medium") riskScore = Math.max(riskScore, 1);
      if (def.risk === "high") riskScore = Math.max(riskScore, 2);

      if (def.id === "insert_row" || def.id === "update_row" || def.id === "delete_row") {
        hasUncommittedDml = true;
      }
      if (def.id === "commit_tx" || def.category === "ddl" || (def.id === "rollback_tx" && !String(p.sp || "").trim())) {
        hasUncommittedDml = false;
      }
      if (def.id === "rman_backup_db" || def.id === "rman_backup_ctrl" || def.id === "backup_controlfile_trace") {
        hasBackup = true;
      }

      if (entry.depth > 0) {
        if (def.kind === "rman") {
          warnings.push({
            level: "warn",
            text: "La tarjeta RMAN '" + def.title + "' no puede ir dentro de un bloque PL/SQL; sácala al flujo principal o usa la vista Solo RMAN."
          });
        } else if (def.category === "ddl" || def.category === "storage") {
          warnings.push({
            level: "warn",
            text: "Oracle no permite ejecutar '" + def.title + "' directamente dentro de BEGIN...END; muévela fuera del bloque PL/SQL (o usa EXECUTE IMMEDIATE)."
          });
        } else if (def.category === "session" && def.id !== "savepoint") {
          warnings.push({
            level: "warn",
            text: "La directiva '" + def.title + "' debe colocarse fuera del bloque PL/SQL, al inicio del script."
          });
        }
      }

      if ((def.id === "delete_row" || def.id === "update_row") && !String(p.cond || "").trim()) {
        riskScore = 2;
        warnings.push({
          level: "warn",
          text: def.title + " no tiene cláusula WHERE: afectará a todas las filas de la tabla."
        });
      }

      if (def.id === "truncate_table" && !hasBackup) {
        warnings.push({
          level: "warn",
          text: "TRUNCATE TABLE es DDL irreversible (no admite ROLLBACK). Considera respaldar antes."
        });
      }

      if (def.id === "dbms_output" && entry.depth === 0) {
        warnings.push({
          level: "warn",
          text: "DBMS_OUTPUT.PUT_LINE fuera de un bloque PL/SQL (BEGIN ... END) dará error en SQL*Plus."
        });
      }

      if (def.id === "rman_recover_db") {
        warnings.push({
          level: "warn",
          text: "RESTORE / RECOVER DATABASE requiere que la instancia esté en estado MOUNT y con respaldo verificado."
        });
      }
    });

    if (hasUncommittedDml) {
      warnings.push({
        level: "warn",
        text: "Hay operaciones DML sin COMMIT ni ROLLBACK al final: los cambios quedarán pendientes en sesión."
      });
    }

    if (hasSql && hasRman) {
      warnings.push({
        level: "warn",
        text: "Mezcla SQL y RMAN: SQL*Plus/SQLcl ejecutan el bloque SQL, mientras que RMAN requiere `rman target /`. Usa la pestaña Solo RMAN para separarlo."
      });
    }

    if (flat.length > 0 && warnings.length === 0) {
      warnings.push({
        level: "ok",
        text: "Flujo estructuralmente consistente: sin operaciones sin filtro ni transacciones abiertas."
      });
    }

    var riskLevel = riskScore === 2 ? "high" : riskScore === 1 ? "medium" : "low";
    return {
      counts: counts,
      warnings: warnings,
      hasSql: hasSql,
      hasRman: hasRman,
      riskLevel: riskLevel
    };
  }

  function highlightSqlHtml(code) {
    var escaped = String(code || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    var tokenRegex = /'[^']*'|\b(?:ALTER|SESSION|SET|CONTAINER|CREATE|TABLESPACE|DATAFILE|SIZE|AUTOEXTEND|ON|OFF|NEXT|MAXSIZE|TABLE|PRIMARY|KEY|ADD|INDEX|TRUNCATE|SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|DELETE|COMMIT|ROLLBACK|TO|SAVEPOINT|SYSTEM|SWITCH|LOGFILE|CHECKPOINT|DATABASE|BACKUP|CONTROLFILE|TRACE|AS|DECLARE|BEGIN|EXCEPTION|WHEN|OTHERS|THEN|RAISE|END|FOR|IN|LOOP|CONFIGURE|AUTOBACKUP|PLUS|ARCHIVELOG|FORMAT|RESTORE|RECOVER|RESIZE|WHENEVER|SQLERROR|EXIT|PROMPT|SERVEROUTPUT|UNLIMITED|NUMBER|VARCHAR2|DATE|DEFAULT|SYSDATE|NULL|CURRENT)\b/g;

    return escaped
      .split("\n")
      .map(function (line) {
        if (/^\s*--/.test(line)) {
          return '<span class="tok-cm">' + line + "</span>";
        }
        return line.replace(tokenRegex, function (match) {
          if (match.charAt(0) === "'") {
            return '<span class="tok-str">' + match + "</span>";
          }
          return '<span class="tok-kw">' + match + "</span>";
        });
      })
      .join("\n");
  }

  global.OraBlock = global.OraBlock || {};
  global.OraBlock.Catalog = {
    CATEGORIES: CATEGORIES,
    COMMANDS: COMMANDS,
    COMMAND_MAP: COMMAND_MAP,
    PRESETS: PRESETS,
    createBlockInstance: createBlockInstance,
    buildScript: buildScript,
    analyzeScript: analyzeScript,
    highlightSqlHtml: highlightSqlHtml
  };
})(window);
