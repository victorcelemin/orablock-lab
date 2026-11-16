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
    },
    {
      id: "create_user_ro",
      category: "session",
      title: "Crear usuario Read-Only",
      kind: "sql",
      risk: "medium",
      storageEffect: "none",
      impactTag: "Mínimo privilegio",
      syntaxPreview: "CREATE USER ...; GRANT SELECT_CATALOG_ROLE",
      hint: "Crea un usuario seguro para IA o monitoreo: solo puede leer vistas V$ sin modificar datos.",
      fields: [
        { key: "user", label: "Usuario", type: "text", default: "AGENT_RO" },
        { key: "pwd", label: "Clave temporal", type: "text", default: "Cambiar_2026" }
      ],
      render: function (p) {
        var u = safeIdent(p.user, "AGENT_RO");
        var pwd = safeIdent(p.pwd, "Cambiar_2026");
        return [
          "CREATE USER " + u + " IDENTIFIED BY \"" + pwd.replace(/"/g, "") + "\";",
          "GRANT CREATE SESSION, SELECT_CATALOG_ROLE TO " + u + ";"
        ];
      }
    },
    {
      id: "create_view",
      category: "ddl",
      title: "Crear Vista (VIEW)",
      kind: "sql",
      risk: "low",
      storageEffect: "none",
      impactTag: "Consulta guardada",
      syntaxPreview: "CREATE OR REPLACE VIEW ... AS SELECT ...",
      hint: "Guarda una consulta SQL con nombre propio para reutilizarla sin duplicar datos en disco.",
      fields: [
        { key: "view", label: "Vista", type: "text", default: "V_VENTAS_RESUMEN" },
        { key: "query", label: "SELECT", type: "text", default: "SELECT ID_VENTA, MONTO FROM VENTAS_REG", wide: true }
      ],
      render: function (p) {
        return [
          "CREATE OR REPLACE VIEW " + safeIdent(p.view, "V_RESUMEN") + " AS",
          "  " + safeIdent(p.query, "SELECT 1 AS OK FROM DUAL") + ";"
        ];
      }
    },
    {
      id: "add_fk_constraint",
      category: "ddl",
      title: "Añadir Clave Foránea (FK)",
      kind: "sql",
      risk: "medium",
      storageEffect: "none",
      impactTag: "Integridad DDL",
      syntaxPreview: "ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY",
      hint: "Conecta dos tablas garantizando que ningún registro apunte a un padre inexistente.",
      fields: [
        { key: "table", label: "Tabla hija", type: "text", default: "VENTAS_REG" },
        { key: "cname", label: "Restricción", type: "text", default: "FK_VENTAS_CLI" },
        { key: "col", label: "Columna", type: "text", default: "ID_CLIENTE" },
        { key: "ref", label: "Referencias", type: "text", default: "CLIENTES(ID_CLIENTE)" }
      ],
      render: function (p) {
        return [
          "ALTER TABLE " + safeIdent(p.table, "VENTAS_REG") +
          " ADD CONSTRAINT " + safeIdent(p.cname, "FK_TABLA") +
          " FOREIGN KEY (" + safeIdent(p.col, "ID_REF") + ") REFERENCES " + safeIdent(p.ref, "MAESTRO(ID)") + ";"
        ];
      }
    },
    {
      id: "merge_upsert",
      category: "dml",
      title: "Insertar o Actualizar (MERGE)",
      kind: "sql",
      risk: "medium",
      storageEffect: "dml",
      impactTag: "Undo + Redo",
      syntaxPreview: "MERGE INTO ... WHEN MATCHED THEN UPDATE ...",
      hint: "Si la fila ya existe la actualiza y si no existe la inserta en una sola transacción.",
      fields: [
        { key: "table", label: "Tabla", type: "text", default: "VENTAS_REG" },
        { key: "srcId", label: "ID", type: "text", default: "101" },
        { key: "srcMonto", label: "Monto", type: "text", default: "490.00" }
      ],
      render: function (p) {
        var t = safeIdent(p.table, "VENTAS_REG");
        var id = safeIdent(p.srcId, "101");
        var m = safeIdent(p.srcMonto, "490.00");
        return [
          "MERGE INTO " + t + " dest",
          "USING (SELECT " + id + " AS id_v, " + m + " AS mnt FROM DUAL) src",
          "ON (dest.ID_VENTA = src.id_v)",
          "WHEN MATCHED THEN UPDATE SET dest.MONTO = src.mnt",
          "WHEN NOT MATCHED THEN INSERT (ID_VENTA, MONTO) VALUES (src.id_v, src.mnt);"
        ];
      }
    },
    {
      id: "resize_datafile",
      category: "storage",
      title: "Redimensionar Datafile",
      kind: "sql",
      risk: "medium",
      storageEffect: "datafile",
      impactTag: "Amplía .dbf + .ctl",
      syntaxPreview: "ALTER DATABASE DATAFILE '...' RESIZE ...",
      hint: "Cambia el tamaño físico de un Datafile .dbf existente y actualiza su metadata en el Control File.",
      fields: [
        { key: "datafile", label: "Datafile", type: "text", default: "/u01/oradata/tbs_ventas01.dbf", wide: true },
        { key: "size", label: "Nuevo SIZE", type: "text", default: "250M" }
      ],
      render: function (p) {
        return [
          "ALTER DATABASE DATAFILE '" + escapeSqlString(safeIdent(p.datafile, "/u01/oradata/users01.dbf")) +
          "' RESIZE " + safeIdent(p.size, "250M") + ";"
        ];
      }
    },
    {
      id: "add_redo_group",
      category: "storage",
      title: "Crear Grupo Redo Multiplexado",
      kind: "sql",
      risk: "medium",
      storageEffect: "checkpoint",
      impactTag: "Espejo .log + .ctl",
      syntaxPreview: "ALTER DATABASE ADD LOGFILE GROUP ... ('...', '...')",
      hint: "Añade un grupo Online Redo Log con 2 copias espejo en discos distintos para tolerar fallos.",
      fields: [
        { key: "grp", label: "Grupo #", type: "text", default: "3" },
        { key: "m1", label: "Miembro A", type: "text", default: "/u01/oradata/redo03a.log", wide: true },
        { key: "m2", label: "Miembro B", type: "text", default: "/u02/oradata/redo03b.log", wide: true },
        { key: "size", label: "SIZE", type: "text", default: "100M" }
      ],
      render: function (p) {
        return [
          "ALTER DATABASE ADD LOGFILE GROUP " + safeIdent(p.grp, "3") + " (",
          "  '" + escapeSqlString(safeIdent(p.m1, "/u01/oradata/redo03a.log")) + "',",
          "  '" + escapeSqlString(safeIdent(p.m2, "/u02/oradata/redo03b.log")) + "'",
          ") SIZE " + safeIdent(p.size, "100M") + ";"
        ];
      }
    },
    {
      id: "check_archivelog",
      category: "storage",
      title: "Verificar modo ARCHIVELOG",
      kind: "sql",
      risk: "low",
      storageEffect: "none",
      impactTag: "Lee Controlfile",
      syntaxPreview: "SELECT LOG_MODE, OPEN_MODE FROM V$DATABASE;",
      hint: "Comprueba si Oracle guarda copias históricas de los Redo Logs llenos (imprescindible en producción).",
      fields: [],
      render: function () {
        return ["SELECT NAME, LOG_MODE, OPEN_MODE, FLASHBACK_ON FROM V$DATABASE;"];
      }
    },
    {
      id: "plsql_if",
      category: "plsql",
      title: "Condicional IF ... THEN",
      kind: "cblock",
      cblockFamily: "plsql",
      footLabel: "END IF;",
      risk: "low",
      storageEffect: "none",
      impactTag: "Contenedor C",
      syntaxPreview: "IF [condición] THEN [bloques] END IF;",
      hint: "Caja Scratch C: ejecuta las tarjetas internas únicamente cuando se cumpla la condición.",
      fields: [
        { key: "cond", label: "Si se cumple", type: "text", default: "v_lote IS NOT NULL", wide: true }
      ],
      renderHead: function (p) {
        return ["IF " + safeIdent(p.cond, "1 = 1") + " THEN"];
      },
      renderFoot: function () {
        return ["END IF;"];
      }
    },
    {
      id: "plsql_cursor_loop",
      category: "plsql",
      title: "Recorrer consulta (CURSOR FOR)",
      kind: "cblock",
      cblockFamily: "plsql",
      footLabel: "END LOOP;",
      risk: "low",
      storageEffect: "dml",
      impactTag: "Bucle Consulta C",
      syntaxPreview: "FOR reg IN (SELECT ...) LOOP [bloques] END LOOP;",
      hint: "Caja Scratch C: recorre fila por fila el resultado de un SELECT usando la variable de registro.",
      fields: [
        { key: "rec", label: "Registro", type: "text", default: "reg" },
        { key: "query", label: "Consulta", type: "text", default: "SELECT ID_VENTA, MONTO FROM VENTAS_REG", wide: true }
      ],
      renderHead: function (p) {
        return ["FOR " + safeIdent(p.rec, "reg") + " IN (" + safeIdent(p.query, "SELECT 1 AS N FROM DUAL") + ") LOOP"];
      },
      renderFoot: function () {
        return ["END LOOP;"];
      }
    },
    {
      id: "rman_run_block",
      category: "rman",
      title: "Bloque RMAN RUN { ... }",
      kind: "cblock",
      cblockFamily: "rman",
      footLabel: "} (Fin RMAN RUN)",
      risk: "medium",
      storageEffect: "datafile",
      impactTag: "Contenedor RMAN C",
      syntaxPreview: "RUN { ALLOCATE CHANNEL ...; [bloques RMAN] }",
      hint: "Caja Scratch C para RMAN: agrupa canales y respaldos que deben ejecutarse juntos en RMAN.",
      fields: [
        { key: "ch", label: "Canal", type: "text", default: "ch1" }
      ],
      renderHead: function (p) {
        return [
          "RUN {",
          "  ALLOCATE CHANNEL " + safeIdent(p.ch, "ch1") + " DEVICE TYPE DISK;"
        ];
      },
      renderFoot: function (p) {
        return [
          "  RELEASE CHANNEL " + safeIdent(p.ch, "ch1") + ";",
          "}"
        ];
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
      disabled: Boolean(overrides && overrides.disabled),
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
      var ifBlk = createBlockInstance("plsql_if", { cond: "v_lote IS NOT NULL" });
      ifBlk.children = [
        createBlockInstance("dbms_output", { text: "Lote procesado correctamente con SAVEPOINT" })
      ];
      var plsqlBlk = createBlockInstance("plsql_block", { varDecl: "v_lote VARCHAR2(30) := 'LOTE_01';" });
      plsqlBlk.children = [
        createBlockInstance("savepoint", { name: "SP_INICIO" }),
        loopBlk,
        ifBlk,
        createBlockInstance("commit_tx")
      ];
      return [
        createBlockInstance("set_serveroutput", { mode: "ON" }),
        createBlockInstance("alter_container", { pdb: "ORCLPDB1" }),
        plsqlBlk
      ];
    },
    redo_rman: function () {
      var rmanRun = createBlockInstance("rman_run_block", { ch: "ch1" });
      rmanRun.children = [
        createBlockInstance("rman_backup_db"),
        createBlockInstance("rman_backup_ctrl", { path: "/u01/backup/ctl_%U.bkp" })
      ];
      return [
        createBlockInstance("prompt_msg", { msg: "Rotando Redo Log y forzando Checkpoint antes de respaldar" }),
        createBlockInstance("switch_logfile"),
        createBlockInstance("system_checkpoint"),
        createBlockInstance("backup_controlfile_trace", { path: "/u01/backup/ctl_recreate.sql" }),
        createBlockInstance("rman_autobackup"),
        rmanRun
      ];
    },
    storage_views: function () {
      return [
        createBlockInstance("select_query", { cols: "NAME, STATUS", table: "V$CONTROLFILE", cond: "" }),
        createBlockInstance("select_query", { cols: "FILE#, NAME, CHECKPOINT_CHANGE#, STATUS", table: "V$DATAFILE", cond: "" }),
        createBlockInstance("select_query", { cols: "GROUP#, SEQUENCE#, BYTES/1024/1024 AS MB, STATUS", table: "V$LOG", cond: "" }),
        createBlockInstance("select_query", { cols: "GROUP#, MEMBER, TYPE", table: "V$LOGFILE", cond: "" })
      ];
    },
    storage_multiplex: function () {
      return [
        createBlockInstance("check_archivelog"),
        createBlockInstance("add_redo_group", {
          grp: "3",
          m1: "/u01/oradata/redo03a.log",
          m2: "/u02/oradata/redo03b.log",
          size: "100M"
        }),
        createBlockInstance("resize_datafile", {
          datafile: "/u01/oradata/tbs_ventas01.dbf",
          size: "250M"
        }),
        createBlockInstance("system_checkpoint"),
        createBlockInstance("create_user_ro", { user: "AGENT_RO", pwd: "Cambiar_2026" })
      ];
    }
  };

  function isRmanCblock(def) {
    return def && def.kind === "cblock" && (def.cblockFamily === "rman" || def.category === "rman");
  }

  function flattenBlocks(blocks, depth, out, parentDef, parentDisabled) {
    depth = depth || 0;
    out = out || [];
    (blocks || []).forEach(function (blk) {
      var def = COMMAND_MAP[blk.commandId];
      if (!def) return;
      var effectiveDisabled = Boolean(parentDisabled || blk.disabled);
      out.push({ blk: blk, def: def, depth: depth, parentDef: parentDef || null, disabled: effectiveDisabled });
      if (def.kind === "cblock" && Array.isArray(blk.children)) {
        flattenBlocks(blk.children, depth + 1, out, def, effectiveDisabled);
      }
    });
    return out;
  }

  function renderLinesWithMap(blocks, outputMode, indentStr, lineOffset, blockRanges, forceDisabled) {
    indentStr = indentStr || "";
    lineOffset = lineOffset || 0;
    blockRanges = blockRanges || {};
    var lines = [];

    function pushLine(l, commentPrefix) {
      lines.push(commentPrefix ? indentStr + commentPrefix + l : indentStr + l);
    }

    (blocks || []).forEach(function (blk) {
      var def = COMMAND_MAP[blk.commandId];
      if (!def) return;
      var isDisabled = Boolean(forceDisabled || blk.disabled);
      var rmanBlock = isRmanCblock(def);
      var isRmanItem = def.kind === "rman" || rmanBlock;

      if (outputMode === "rman" && !isRmanItem) {
        if (def.kind === "cblock" && Array.isArray(blk.children)) {
          var subOnly = renderLinesWithMap(
            blk.children,
            outputMode,
            indentStr,
            lineOffset + lines.length,
            blockRanges,
            isDisabled
          );
          lines = lines.concat(subOnly);
        }
        return;
      }

      var startLine = lineOffset + lines.length + 1;
      var prefix = "";
      if (isDisabled) {
        prefix = "-- [Pausado] ";
      } else if (outputMode === "sql" && isRmanItem) {
        prefix = "-- [Ejecutar en RMAN] ";
      }

      if (def.kind === "cblock") {
        def.renderHead(blk.params).forEach(function (l) {
          pushLine(l, prefix);
        });
        var inner = renderLinesWithMap(
          blk.children || [],
          outputMode,
          indentStr + "  ",
          lineOffset + lines.length,
          blockRanges,
          isDisabled
        );
        if (inner.length === 0) {
          if (rmanBlock) {
            pushLine("-- (Sin sentencias RMAN dentro del bloque RUN)", isDisabled ? "-- [Pausado] " : "");
          } else {
            pushLine("  NULL;", isDisabled ? "-- [Pausado] " : "");
          }
        } else {
          lines = lines.concat(inner);
        }
        def.renderFoot(blk.params).forEach(function (l) {
          pushLine(l, prefix);
        });
      } else {
        def.render(blk.params).forEach(function (l) {
          pushLine(l, prefix);
        });
      }

      var endLine = lineOffset + lines.length;
      blockRanges[blk.uid] = { start: startLine, end: Math.max(startLine, endLine) };
    });

    return lines;
  }

  function buildScriptWithMap(blocks, outputMode) {
    var mode = outputMode === "rman" ? "rman" : "sql";
    if (!blocks || blocks.length === 0) {
      var emptyText = mode === "rman"
        ? "-- Agrega tarjetas RMAN para generar comandos de respaldo o recuperación."
        : "-- Arrastra o haz clic en las tarjetas de la izquierda para construir tu script Oracle.";
      return { text: emptyText, blockRanges: {} };
    }
    var header = mode === "rman"
      ? ["-- Script RMAN generado por OraBlock Lab", "-- Conectar con: rman target /"]
      : ["-- Script Oracle SQL / PL-SQL generado por OraBlock Lab"];
    var blockRanges = {};
    var bodyLines = renderLinesWithMap(blocks, mode, "", header.length, blockRanges, false);
    if (mode === "rman" && bodyLines.length === 0) {
      return {
        text: "-- El lienzo actual no contiene tarjetas RMAN.\n-- Agrega bloques rojos de RMAN o cambia a vista SQL / PL-SQL.",
        blockRanges: {}
      };
    }
    return {
      text: header.concat(bodyLines).join("\n"),
      blockRanges: blockRanges
    };
  }

  function buildScript(blocks, outputMode) {
    return buildScriptWithMap(blocks, outputMode).text;
  }

  function summarizeStorageImpact(blocks) {
    var flat = flattenBlocks(blocks);
    var active = flat.filter(function (entry) {
      return !entry.disabled;
    });
    var disabledCount = flat.length - active.length;
    var impact = {
      ramBuffer: false,
      redoLog: false,
      datafile: false,
      controlFile: false,
      activeCount: active.length,
      disabledCount: disabledCount
    };

    active.forEach(function (entry) {
      var eff = entry.def.storageEffect;
      if (eff === "dml") {
        impact.ramBuffer = true;
        impact.redoLog = true;
      } else if (eff === "commit") {
        impact.redoLog = true;
      } else if (eff === "datafile") {
        impact.datafile = true;
        impact.controlFile = true;
      } else if (eff === "checkpoint") {
        impact.ramBuffer = true;
        impact.redoLog = true;
        impact.datafile = true;
        impact.controlFile = true;
      } else if (eff === "controlfile") {
        impact.controlFile = true;
      }
    });

    return impact;
  }

  function analyzeScript(blocks) {
    var flat = flattenBlocks(blocks);
    var counts = { total: flat.length, active: 0, disabled: 0, session: 0, ddl: 0, dml: 0, storage: 0, plsql: 0, rman: 0 };
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
      if (entry.disabled) {
        counts.disabled += 1;
        return;
      }
      counts.active += 1;

      var rmanBlock = isRmanCblock(def);
      var isRmanItem = def.kind === "rman" || rmanBlock;

      if (isRmanItem) hasRman = true;
      else hasSql = true;

      if (def.risk === "medium") riskScore = Math.max(riskScore, 1);
      if (def.risk === "high") riskScore = Math.max(riskScore, 2);

      if (def.id === "insert_row" || def.id === "update_row" || def.id === "delete_row" || def.id === "merge_upsert") {
        hasUncommittedDml = true;
      }
      if (def.id === "commit_tx" || def.category === "ddl" || (def.id === "rollback_tx" && !String(p.sp || "").trim())) {
        hasUncommittedDml = false;
      }
      if (def.id === "rman_backup_db" || def.id === "rman_backup_ctrl" || def.id === "backup_controlfile_trace") {
        hasBackup = true;
      }

      if (entry.depth > 0 && entry.parentDef) {
        if (isRmanCblock(entry.parentDef)) {
          if (!isRmanItem) {
            warnings.push({
              level: "warn",
              text: "Dentro de 'Bloque RMAN RUN { ... }' solo van tarjetas rojas RMAN; '" + def.title + "' debe ir fuera en el flujo SQL."
            });
          }
        } else if (isRmanItem) {
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

    if (counts.active > 0 && warnings.length === 0) {
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

  function highlightSqlHtml(code, activeRange) {
    var escaped = String(code || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    var tokenRegex = /'[^']*'|\b(?:ALTER|SESSION|SET|CONTAINER|CREATE|TABLESPACE|DATAFILE|SIZE|AUTOEXTEND|ON|OFF|NEXT|MAXSIZE|TABLE|PRIMARY|KEY|ADD|INDEX|TRUNCATE|SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|DELETE|COMMIT|ROLLBACK|TO|SAVEPOINT|SYSTEM|SWITCH|LOGFILE|CHECKPOINT|DATABASE|BACKUP|CONTROLFILE|TRACE|AS|DECLARE|BEGIN|EXCEPTION|WHEN|OTHERS|THEN|RAISE|END|FOR|IN|LOOP|IF|OR|REPLACE|VIEW|CONSTRAINT|FOREIGN|REFERENCES|MERGE|USING|MATCHED|NOT|IS|NULL|CURRENT|USER|IDENTIFIED|BY|GRANT|RUN|ALLOCATE|CHANNEL|DEVICE|TYPE|DISK|RELEASE|CONFIGURE|AUTOBACKUP|PLUS|ARCHIVELOG|FORMAT|RESTORE|RECOVER|RESIZE|WHENEVER|SQLERROR|EXIT|PROMPT|SERVEROUTPUT|UNLIMITED|NUMBER|VARCHAR2|DATE|DEFAULT|SYSDATE|DUAL|LOGFILE|GROUP)\b/g;

    return escaped
      .split("\n")
      .map(function (line, idx) {
        var lineNum = idx + 1;
        var highlighted = Boolean(activeRange && lineNum >= activeRange.start && lineNum <= activeRange.end);
        var rendered = /^\s*--/.test(line)
          ? '<span class="tok-cm">' + line + "</span>"
          : line.replace(tokenRegex, function (match) {
              if (match.charAt(0) === "'") {
                return '<span class="tok-str">' + match + "</span>";
              }
              return '<span class="tok-kw">' + match + "</span>";
            });
        return '<span class="code-line' + (highlighted ? " is-highlighted" : "") + '">' + (rendered || " ") + "</span>";
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
    buildScriptWithMap: buildScriptWithMap,
    summarizeStorageImpact: summarizeStorageImpact,
    analyzeScript: analyzeScript,
    highlightSqlHtml: highlightSqlHtml
  };
})(window);
