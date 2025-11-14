# 📚 Estructuras de Datos Utilizadas en GameScreen

Este documento describe todas las estructuras de datos implementadas y su uso en el juego.

---

## 🎯 Estructuras de Datos Implementadas

### 1. **Queue (Cola - FIFO)** 📥
**Archivo:** `src/lib/Queue.ts`

**Uso:** Gestión de preguntas pendientes
- **Principio:** First In, First Out (FIFO)
- **Ubicación en código:** `questionQueue`
- **Propósito:** Mantiene un buffer de preguntas generadas para garantizar que siempre haya preguntas disponibles sin necesidad de generarlas en tiempo real

**Operaciones principales:**
- `enqueue()` - Agregar pregunta a la cola
- `dequeue()` - Obtener la siguiente pregunta
- `size()` - Verificar cuántas preguntas quedan

---

### 2. **Stack (Pila - LIFO)** 📚
**Archivo:** `src/lib/Stack.ts`

**Uso:** Historial de intentos recientes
- **Principio:** Last In, First Out (LIFO)
- **Ubicación en código:** `historyStack`
- **Propósito:** Almacena los intentos del jugador mostrando primero los más recientes

**Operaciones principales:**
- `push()` - Agregar nuevo intento
- `pop()` - Remover el intento más reciente
- `peek()` - Ver el último intento sin removerlo
- `toArray()` - Convertir a array para mostrar en UI

**Visualización:** Panel "📜 Intentos recientes (Stack)" con scroll horizontal

---

### 3. **LinkedList (Lista Enlazada)** 🔗
**Archivo:** `src/lib/LinkedList.ts`

**Uso:** Leaderboard / Historial de partidas
- **Principio:** Lista enlazada simple
- **Ubicación en código:** `leaderboard` (useMemo)
- **Propósito:** Gestiona el historial de todas las partidas jugadas, permitiendo agregar elementos de forma eficiente

**Operaciones principales:**
- `add()` - Agregar nuevo resultado
- `toArray()` - Convertir a array para mostrar
- `size()` - Obtener cantidad de elementos

**Visualización:** Panel "🏅 Historial reciente (LinkedList)" con scroll horizontal

---

### 4. **Map (HashMap)** 🗺️
**Archivo:** `src/lib/PanelStateManager.ts`

**Uso:** Gestión de estados de paneles expandibles
- **Principio:** Estructura clave-valor (HashMap)
- **Ubicación en código:** `PanelStateManager` en `panelManager`
- **Propósito:** Gestiona de forma centralizada el estado de expansión/colapso de múltiples paneles en la interfaz

**Operaciones principales:**
- `setPanel()` - Establecer estado de un panel
- `getPanel()` - Obtener estado actual
- `togglePanel()` - Alternar entre expandido/colapsado
- `expandAll()` - Expandir todos los paneles
- `collapseAll()` - Colapsar todos los paneles
- `getAllStates()` - Obtener todos los estados

**Paneles gestionados:**
- `'history'` - Panel de intentos recientes (Stack)
- `'leaderboard'` - Panel de historial (LinkedList)

**Ventajas:**
- ✅ Escalable: fácil agregar nuevos paneles
- ✅ Centralizado: un solo punto de gestión
- ✅ Eficiente: acceso O(1) a estados
- ✅ Mantenible: lógica separada y reutilizable

---

### 5. **Array (Lista Dinámica)** 📋
**Archivo:** `src/lib/LayoutManager.ts`

**Uso:** Gestión del orden y configuración del layout de paneles
- **Principio:** Array ordenado de configuraciones de paneles
- **Ubicación en código:** `LayoutManager` en `layoutManager`
- **Propósito:** Controla el orden, visibilidad, prioridad y configuración de todos los paneles en la UI

**Operaciones principales:**
- `addPanel()` - Agregar nuevo panel al layout
- `removePanel()` - Eliminar panel
- `updatePanel()` - Actualizar configuración de un panel
- `reorderPanel()` - Cambiar orden de un panel
- `setPanelVisibility()` - Mostrar/ocultar panel
- `getVisiblePanels()` - Obtener paneles visibles ordenados
- `getPanelsByPriority()` - Filtrar por prioridad
- `moveUp()` / `moveDown()` - Mover paneles arriba/abajo

**Configuración de paneles:**
```typescript
{
  id: string,              // Identificador único
  name: string,            // Nombre descriptivo
  order: number,           // Posición en el layout (0 = primero)
  visible: boolean,        // Visibilidad
  priority: 'high'|'medium'|'low',  // Prioridad
  minHeight: number        // Altura mínima en px
}
```

**Paneles configurados:**
1. `game-panel` (orden: 0) - Panel principal del juego [ALTA prioridad]
2. `stats-panel` (orden: 1) - Panel de estadísticas [ALTA prioridad]
3. `history-panel` (orden: 2) - Historial Stack [MEDIA prioridad]
4. `leaderboard-panel` (orden: 3) - Historial LinkedList [MEDIA prioridad]

**Ventajas:**
- ✅ Orden garantizado con sort() automático
- ✅ Configuración flexible de cada panel
- ✅ Fácil reordenamiento y priorización
- ✅ Exportable/importable como JSON
- ✅ Escalable para nuevos paneles

---

## 🎮 Flujo de Datos en el Juego

```
┌─────────────────────┐
│  Generar Pregunta   │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │    Queue     │  ← Buffer de preguntas (FIFO)
    │   (8 items)  │
    └──────┬───────┘
           │ dequeue()
           ▼
    ┌──────────────┐
    │   Jugador    │
    │   Responde   │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │    Stack     │  ← Historial reciente (LIFO)
    │  (intentos)  │
    └──────────────┘
           │
           ▼
    ┌──────────────┐
    │ LinkedList   │  ← Historial completo
    │ (resultados) │
    └──────────────┘
           │
           ▼
    ┌──────────────┐
    │     Map      │  ← Estado de paneles
    │ (expandidos) │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │    Array     │  ← Layout y orden
    │   (paneles)  │
    └──────────────┘
```

---

## 🎨 Visualización en la UI

### Panel de Intentos (Stack)
- **Botón:** ▶ / ▼ para expandir/colapsar
- **Badge:** Verde "STACK" con tooltip
- **Scroll:** Horizontal con tarjetas individuales
- **Datos:** Pregunta, respuesta del usuario, respuesta correcta, timestamp
- **Orden:** Más reciente primero (LIFO)

### Panel de Historial (LinkedList)
- **Botón:** ▶ / ▼ para expandir/colapsar
- **Badge:** Verde "LINKEDLIST" con tooltip
- **Scroll:** Horizontal con tarjetas individuales
- **Datos:** Jugador, dificultad, puntaje, aciertos, duración, fecha
- **Orden:** Últimas 10 partidas

---

## 📊 Complejidad de Operaciones

| Estructura    | Inserción    | Búsqueda | Eliminación | Reordenar  | Espacio |
|---------------|--------------|----------|-------------|------------|---------|
| Queue         | O(1)         | O(n)     | O(1)        | N/A        | O(n)    |
| Stack         | O(1)         | O(n)     | O(1)        | N/A        | O(n)    |
| LinkedList    | O(1)*        | O(n)     | O(n)        | N/A        | O(n)    |
| Map           | O(1)         | O(1)     | O(1)        | N/A        | O(n)    |
| Array (Sort)  | O(1)         | O(n)     | O(n)        | O(n log n) | O(n)    |

*Inserción al final de la LinkedList

---

## 🚀 Extensiones Futuras

Posibles estructuras de datos adicionales:

1. **Tree (Árbol)** - Para categorización de preguntas por dificultad
2. **Graph (Grafo)** - Para sistema de logros y progresión
3. **Priority Queue** - Para ordenar preguntas por prioridad
4. **Hash Table** - Para caché de respuestas frecuentes
5. **Circular Queue** - Para rotación de preguntas

---

## 📝 Notas de Implementación

- Todas las estructuras están implementadas desde cero (sin librerías externas)
- Uso de TypeScript genérico para reutilización
- Integración con React usando `useRef` y `useMemo`
- Actualización eficiente de la UI usando `useState` y callbacks
- Todas las estructuras son type-safe

---

**Autor:** Valen Team  
**Última actualización:** 14 de noviembre de 2025
