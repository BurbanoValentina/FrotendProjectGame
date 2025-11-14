/**
 * LayoutManager - Estructura de datos basada en Array para gestionar
 * el orden y configuración de paneles en el layout del juego
 * 
 * Utiliza un Array de objetos para mantener la configuración y orden
 * de los paneles en la interfaz de usuario.
 */

export interface PanelConfig {
  id: string;
  name: string;
  order: number;
  visible: boolean;
  priority: 'high' | 'medium' | 'low';
  minHeight?: number;
  gridArea?: string;
}

export class LayoutManager {
  private panels: PanelConfig[];

  constructor(initialPanels: PanelConfig[] = []) {
    this.panels = [...initialPanels];
    this.sortPanels();
  }

  /**
   * Ordena los paneles según su propiedad 'order'
   * Complejidad: O(n log n)
   */
  private sortPanels(): void {
    this.panels.sort((a, b) => a.order - b.order);
  }

  /**
   * Añade un nuevo panel al layout
   * @param panel - Configuración del panel a añadir
   */
  addPanel(panel: PanelConfig): void {
    this.panels.push(panel);
    this.sortPanels();
  }

  /**
   * Elimina un panel por su ID
   * @param panelId - ID del panel a eliminar
   */
  removePanel(panelId: string): boolean {
    const index = this.panels.findIndex(p => p.id === panelId);
    if (index !== -1) {
      this.panels.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Obtiene la configuración de un panel específico
   * @param panelId - ID del panel
   */
  getPanel(panelId: string): PanelConfig | undefined {
    return this.panels.find(p => p.id === panelId);
  }

  /**
   * Actualiza la configuración de un panel
   * @param panelId - ID del panel a actualizar
   * @param updates - Propiedades a actualizar
   */
  updatePanel(panelId: string, updates: Partial<PanelConfig>): boolean {
    const panel = this.getPanel(panelId);
    if (panel) {
      Object.assign(panel, updates);
      this.sortPanels();
      return true;
    }
    return false;
  }

  /**
   * Cambia el orden de un panel
   * @param panelId - ID del panel
   * @param newOrder - Nueva posición en el orden
   */
  reorderPanel(panelId: string, newOrder: number): boolean {
    return this.updatePanel(panelId, { order: newOrder });
  }

  /**
   * Establece la visibilidad de un panel
   * @param panelId - ID del panel
   * @param visible - Nuevo estado de visibilidad
   */
  setPanelVisibility(panelId: string, visible: boolean): boolean {
    return this.updatePanel(panelId, { visible });
  }

  /**
   * Obtiene todos los paneles visibles ordenados
   */
  getVisiblePanels(): PanelConfig[] {
    return this.panels.filter(p => p.visible);
  }

  /**
   * Obtiene todos los paneles
   */
  getAllPanels(): PanelConfig[] {
    return [...this.panels];
  }

  /**
   * Obtiene paneles por prioridad
   * @param priority - Nivel de prioridad
   */
  getPanelsByPriority(priority: 'high' | 'medium' | 'low'): PanelConfig[] {
    return this.panels.filter(p => p.priority === priority);
  }

  /**
   * Mueve un panel hacia arriba en el orden
   * @param panelId - ID del panel
   */
  moveUp(panelId: string): boolean {
    const panel = this.getPanel(panelId);
    if (panel && panel.order > 0) {
      return this.reorderPanel(panelId, panel.order - 1);
    }
    return false;
  }

  /**
   * Mueve un panel hacia abajo en el orden
   * @param panelId - ID del panel
   */
  moveDown(panelId: string): boolean {
    const panel = this.getPanel(panelId);
    if (panel && panel.order < this.panels.length - 1) {
      return this.reorderPanel(panelId, panel.order + 1);
    }
    return false;
  }

  /**
   * Restablece el layout a la configuración por defecto
   */
  reset(defaultPanels: PanelConfig[]): void {
    this.panels = [...defaultPanels];
    this.sortPanels();
  }

  /**
   * Obtiene el número total de paneles
   */
  size(): number {
    return this.panels.length;
  }

  /**
   * Cuenta cuántos paneles están visibles
   */
  countVisible(): number {
    return this.panels.filter(p => p.visible).length;
  }

  /**
   * Verifica si un panel existe
   * @param panelId - ID del panel
   */
  hasPanel(panelId: string): boolean {
    return this.panels.some(p => p.id === panelId);
  }

  /**
   * Exporta la configuración actual como JSON
   */
  toJSON(): PanelConfig[] {
    return this.getAllPanels();
  }

  /**
   * Carga configuración desde JSON
   */
  fromJSON(json: PanelConfig[]): void {
    this.panels = json.map(p => ({ ...p }));
    this.sortPanels();
  }
}
