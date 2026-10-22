export interface BusinessPreferences {
  nivel_registro?: 'simple' | 'intermedio' | 'avanzado';
  elementos_por_pagina?: 5 | 10;
  caracteristicas?: string[];
  ejes_variantes?: string[];
}
export const businessTemplates = [
  {
    id: 'Lencería',
    name: 'Lencería y ropa interior',
    level: 'avanzado' as const,
    attributes: ['Marca', 'Modelo'],
    axes: ['Talla', 'Color'],
  },
  {
    id: 'Ropa y accesorios',
    name: 'Ropa y accesorios',
    level: 'avanzado' as const,
    attributes: ['Marca', 'Modelo'],
    axes: ['Talla', 'Color'],
  },
  {
    id: 'Abarrotes',
    name: 'Abarrotes',
    level: 'intermedio' as const,
    attributes: ['Marca', 'Contenido'],
    axes: ['Sabor', 'Contenido'],
  },
  {
    id: 'Juguetes',
    name: 'Juguetes',
    level: 'intermedio' as const,
    attributes: ['Marca', 'Modelo'],
    axes: ['Diseño', 'Color'],
  },
  {
    id: 'Flores y regalos',
    name: 'Flores y regalos',
    level: 'intermedio' as const,
    attributes: ['Tipo', 'Material'],
    axes: ['Tamaño', 'Color'],
  },
];
