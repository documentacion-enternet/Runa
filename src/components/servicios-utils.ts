// src/components/servicios-utils.ts
// Constantes y helpers compartidos entre DetalleServicioView, FichaEmpresa y FormularioInscripcion.
// Separado del componente para que Vite Fast Refresh no se queje.

import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import MoveToInboxOutlinedIcon from '@mui/icons-material/MoveToInboxOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import DrawOutlinedIcon from '@mui/icons-material/DrawOutlined';

export const NOMBRES_DOC: Record<string, string> = {
  '33': 'Factura Afecta', '34': 'Factura Exenta', '39': 'Boleta Afecta', '41': 'Boleta Exenta',
  '43': 'Liquidación de Factura', '46': 'Factura de Compra', '52': 'Guía de Despacho',
  '56': 'Nota de Débito', '61': 'Nota de Crédito',
  '110': 'Factura de Exportación', '111': 'Nota de Débito de Exportación', '112': 'Nota de Crédito de Exportación',
  COM: 'Comanda', TNT: 'Ticket No Tributario',
};

const ETIQUETAS_BONITAS: Record<string, string> = {
  nativo: 'Nativo', BATCH: 'Batch', WS: 'WS', WS_LOCAL: 'WS Local', TXT_V5: 'TXT V5', ninguno: 'Ninguno',
  ciega: 'Ciega', controlada: 'Controlada', activo: 'Activo', inactivo: 'Inactivo',
  EF: 'EF', EFP: 'EFP', BO: 'BO',
};

export function bonito(v: string): string {
  return ETIQUETAS_BONITAS[v] ?? v;
}

export function formatLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()).trim();
}

export const SERVICIOS_INFO: Record<string, { nombre: string; grupo: string }> = {
  EF: { nombre: 'Enterfact Normal', grupo: 'Facturación' },
  EFP: { nombre: 'Enterfact Prima', grupo: 'Facturación' },
  BO: { nombre: 'Back Office', grupo: 'Gestión' },
  POS: { nombre: 'AndesPOS', grupo: 'Operación' },
  'POS BOX': { nombre: 'AndesPOS con Enterbox', grupo: 'Operación' },
  'REC AV': { nombre: 'Recepción Avanzada', grupo: 'Operación' },
  'DTE Prov': { nombre: 'DTE Proveedores', grupo: 'Facturación' },
  INV: { nombre: 'Inventario', grupo: 'Gestión' },
  GF: { nombre: 'Gestor de Firma', grupo: 'Integración' },
};

export const ICONO_POR_CODIGO: Record<string, typeof ReceiptLongOutlinedIcon> = {
  EF: ReceiptLongOutlinedIcon, EFP: DescriptionOutlinedIcon, BO: StorageOutlinedIcon,
  POS: PointOfSaleOutlinedIcon, 'POS BOX': StorefrontOutlinedIcon, 'REC AV': MoveToInboxOutlinedIcon,
  'DTE Prov': LocalShippingOutlinedIcon, INV: Inventory2OutlinedIcon, GF: DrawOutlinedIcon,
};

export const COLOR_POR_GRUPO: Record<string, string> = {
  Facturación: '#5E9C7C', Operación: '#7A6BB0', Gestión: '#B79B85', Integración: '#5B4E82',
};

export function computeDocumentosParaBO(detallesPorCodigo: Record<string, any>): { codigo: string; origen: string }[] {
  const resultado: { codigo: string; origen: string }[] = [];
  for (const origen of ['EF', 'EFP']) {
    const docs = detallesPorCodigo[origen]?.documentos ?? [];
    for (const d of docs) {
      const almacenaEn = Array.isArray(d.almacenaEn) ? d.almacenaEn : [d.almacenaEn];
      if (almacenaEn.includes('BO')) resultado.push({ codigo: d.codigo, origen });
    }
  }
  return resultado;
}