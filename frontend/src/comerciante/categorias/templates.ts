export const categoryTemplates = [
  { id: 'brasieres', nombre: 'Brasieres', detalles: ['Talla', 'Copa', 'Color'] },
  { id: 'ropa', nombre: 'Ropa interior, prendas y pijamas', detalles: ['Talla', 'Color'] },
  { id: 'envasados', nombre: 'Alimentos y bebidas envasados', detalles: ['Contenido', 'Sabor'] },
  { id: 'granel', nombre: 'Alimentos por variedad', detalles: ['Variedad', 'Calidad'] },
  { id: 'limpieza', nombre: 'Productos de limpieza', detalles: ['Contenido', 'Aroma'] },
  {
    id: 'capacidad',
    nombre: 'Artículos por tamaño o capacidad',
    detalles: ['Tamaño', 'Capacidad'],
  },
];

export function categoryDetails(
  categories: { id: string; padre_id: string | null; ejes_variantes?: string[] }[],
  id: string,
) {
  const seen = new Set<string>();
  let category = categories.find((c) => c.id === id);
  while (category && !seen.has(category.id)) {
    seen.add(category.id);
    if (category.ejes_variantes?.length) return [...category.ejes_variantes];
    category = categories.find((c) => c.id === category!.padre_id);
  }
  return [];
}
