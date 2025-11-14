/**
 * PanelStateManager - Estructura de datos basada en Map para gestionar
 * el estado de expansión/colapso de múltiples paneles
 * 
 * Utiliza un HashMap (Map) internamente para almacenar el estado de cada panel
 * identificado por una clave única.
 */
export class PanelStateManager {
  private panelStates: Map<string, boolean>;

  constructor(initialPanels?: Record<string, boolean>) {
    this.panelStates = new Map();
    
    // Inicializar con estados predeterminados si se proporcionan
    if (initialPanels) {
      Object.entries(initialPanels).forEach(([key, value]) => {
        this.panelStates.set(key, value);
      });
    }
  }

  /**
   * Establece el estado de un panel específico
   * @param panelId - Identificador único del panel
   * @param isExpanded - Estado de expansión (true = expandido, false = colapsado)
   */
  setPanel(panelId: string, isExpanded: boolean): void {
    this.panelStates.set(panelId, isExpanded);
  }

  /**
   * Obtiene el estado actual de un panel
   * @param panelId - Identificador único del panel
   * @returns Estado de expansión del panel (por defecto false si no existe)
   */
  getPanel(panelId: string): boolean {
    return this.panelStates.get(panelId) ?? false;
  }

  /**
   * Alterna el estado de un panel (expandido ↔ colapsado)
   * @param panelId - Identificador único del panel
   * @returns Nuevo estado del panel
   */
  togglePanel(panelId: string): boolean {
    const currentState = this.getPanel(panelId);
    const newState = !currentState;
    this.setPanel(panelId, newState);
    return newState;
  }

  /**
   * Verifica si un panel existe en el manager
   * @param panelId - Identificador único del panel
   */
  hasPanel(panelId: string): boolean {
    return this.panelStates.has(panelId);
  }

  /**
   * Expande todos los paneles
   */
  expandAll(): void {
    this.panelStates.forEach((_, key) => {
      this.panelStates.set(key, true);
    });
  }

  /**
   * Colapsa todos los paneles
   */
  collapseAll(): void {
    this.panelStates.forEach((_, key) => {
      this.panelStates.set(key, false);
    });
  }

  /**
   * Obtiene todos los paneles y sus estados
   */
  getAllStates(): Record<string, boolean> {
    const states: Record<string, boolean> = {};
    this.panelStates.forEach((value, key) => {
      states[key] = value;
    });
    return states;
  }

  /**
   * Cuenta cuántos paneles están expandidos
   */
  countExpanded(): number {
    let count = 0;
    this.panelStates.forEach((value) => {
      if (value) count++;
    });
    return count;
  }

  /**
   * Obtiene el tamaño total de paneles registrados
   */
  size(): number {
    return this.panelStates.size;
  }

  /**
   * Limpia todos los estados
   */
  clear(): void {
    this.panelStates.clear();
  }

  /**
   * Exporta el estado actual como objeto para serialización
   */
  toJSON(): Record<string, boolean> {
    return this.getAllStates();
  }
}
