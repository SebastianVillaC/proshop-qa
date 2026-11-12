# 8. Gestión de defectos

## 8.1 Herramienta

Los defectos se gestionan en **GitHub Issues** del repositorio, con un tablero de **GitHub Projects** (vista Kanban). Se eligió porque está integrado con el código y el pipeline de CI: un commit con `Closes #N` cierra el issue automáticamente y deja trazabilidad entre el defecto, la corrección y la verificación.

- **Plantilla de reporte:** `.github/ISSUE_TEMPLATE/reporte-defecto.yml`, un formulario con todos los campos obligatorios.
- **Etiquetas:** `defecto`, `severidad: Crítico|Alto|Medio|Bajo`, `prioridad: P1..P4`, `seguridad`, `estado: en progreso` y `estado: verificado`.
- **Registro maestro:** `.github/defectos.json`. El script `scripts/crear-issues.mjs` crea las etiquetas y los issues a partir de él, sin duplicar los que ya existen.

## 8.2 Clasificación

**Severidad** (impacto técnico y de negocio del defecto):

| Severidad | Criterio |
|---|---|
| **Crítico** | Compromete datos personales o dinero, permite tomar cuentas o bloquea una funcionalidad principal sin alternativa. |
| **Alto** | Funcionalidad importante con un comportamiento incorrecto o una vulnerabilidad explotable con un impacto acotado. Existe un workaround. |
| **Medio** | Una regla de negocio o validación secundaria falla, o se viola un requisito no funcional sin pérdida de datos. |
| **Bajo** | Cosmético, de presentación o de endurecimiento (hardening), con impacto mínimo. |

**Prioridad** (urgencia de la corrección):

| Prioridad | Criterio |
|---|---|
| **P1** | Corregir antes de cualquier despliegue (bloqueante). |
| **P2** | Corregir en la iteración actual. |
| **P3** | Planificar para la siguiente iteración. |
| **P4** | Backlog, cuando haya capacidad. |

La severidad la asigna QA. La prioridad se acuerda con el equipo según el riesgo y el esfuerzo: un defecto Medio puede ser P2 si su corrección es trivial.

## 8.3 Ciclo de vida de un defecto

```
 ┌───────┐   triage    ┌──────────┐  inicia   ┌─────────────┐  commit "Closes #N"  ┌───────────┐
 │ Nuevo │ ──────────► │ Asignado │ ────────► │ En progreso │ ───────────────────► │ Corregido │
 └───────┘             └──────────┘           └─────────────┘                      └─────┬─────┘
     │                                               ▲                                   │ QA reejecuta
     │ no reproducible / duplicado                   │ falla la verificación (Reabierto) │ caso + regresión
     ▼                                               └───────────────────────────────────┤
 ┌───────────┐                                                                           ▼
 │ Rechazado │                                                ┌─────────┐  ok   ┌────────────┐
 └───────────┘                                                │ Cerrado │ ◄──── │ Verificado │
                                                              └─────────┘       └────────────┘
```

| Estado | Representación en GitHub | Quién |
|---|---|---|
| Nuevo | Issue abierto con la etiqueta `defecto` (creado desde la plantilla) | Quien detecta |
| Asignado | *Assignees* + severidad y prioridad + columna "Por hacer" | Responsable de QA |
| En progreso | Etiqueta `estado: en progreso` + columna "En progreso" | Desarrollador |
| Corregido | Commit o PR con `Closes #N` (GitHub cierra el issue y enlaza el commit) | Desarrollador |
| Verificado | Comentario de QA con la evidencia de la reejecución + etiqueta `estado: verificado` | QA (distinto de quien corrigió) |
| Cerrado | Issue cerrado como *completed* | QA |
| Reabierto | *Reopen* si la verificación falla | QA |
| Rechazado | Cerrado como *not planned* con la justificación | Responsable de QA |

**Regla del equipo:** todo defecto corregido debe tener una **prueba automatizada de regresión**. Si el defecto fue documentado con `test.failing('[DEF-xx] …')`, la corrección cambia esa prueba a `test(...)` en el mismo commit.
