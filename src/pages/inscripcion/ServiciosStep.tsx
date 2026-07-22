import { useEffect, useState } from 'react';
import {
  Box, Typography, Alert, Accordion, AccordionSummary, AccordionDetails,
  Chip, Grid, Card,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import MoveToInboxOutlinedIcon from '@mui/icons-material/MoveToInboxOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import DrawOutlinedIcon from '@mui/icons-material/DrawOutlined';
import { supabase } from '../../lib/supabaseClient';
import type { DetallesServicios } from './servicios-types';
import { FormEF } from './servicios/FormEF';
import { FormEFP } from './servicios/FormEFP';
import { FormBO } from './servicios/FormBO';
import { FormPOS } from './servicios/FormPOS';
import { FormPOSBox } from './servicios/FormPOSBox';
import { FormDteProv } from './servicios/FormDteProv';
import { FormRecAv } from './servicios/FormRecAv';
import { FormINV } from './servicios/FormINV';
import { FormGF } from './servicios/FormGF';
import { FormEnConstruccion } from './servicios/FormEnConstruccion';

const ICONO_POR_CODIGO: Record<string, typeof ReceiptLongOutlinedIcon> = {
  EF: ReceiptLongOutlinedIcon,
  EFP: DescriptionOutlinedIcon,
  BO: StorageOutlinedIcon,
  POS: PointOfSaleOutlinedIcon,
  'POS BOX': StorefrontOutlinedIcon,
  'REC AV': MoveToInboxOutlinedIcon,
  'DTE Prov': LocalShippingOutlinedIcon,
  INV: Inventory2OutlinedIcon,
  GF: DrawOutlinedIcon,
};

const COLOR_POR_GRUPO: Record<string, string> = {
  Facturación: '#5E9C7C',
  Operación: '#7A6BB0',
  Gestión: '#B79B85',
  Integración: '#5B4E82',
};

type ServicioCatalogo = { id: string; codigo: string; nombre: string; grupo: string };
type Regla = { servicio_codigo: string; relacionado_codigo: string; tipo_regla: 'excluye' | 'requiere' };
type ComboCerrado = { servicio_disparador: string; combinacion: string[] };

type Props = {
  seleccionados: string[];
  onChangeSeleccionados: (codigos: string[]) => void;
  detalles: DetallesServicios;
  onChangeDetalle: (codigo: string, detalle: unknown) => void;
};

export function ServiciosStep({ seleccionados, onChangeSeleccionados, detalles, onChangeDetalle }: Props) {
  const [catalogo, setCatalogo] = useState<ServicioCatalogo[]>([]);
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [combosCerrados, setCombosCerrados] = useState<ComboCerrado[]>([]);
  const [errorRegla, setErrorRegla] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      const { data: servicios } = await supabase
        .from('servicios_catalogo')
        .select('id, codigo, nombre, grupo')
        .order('grupo', { ascending: true });

      const { data: reglasData } = await supabase
        .from('reglas_servicios')
        .select('tipo_regla, servicio:servicio_id(codigo), relacionado:servicio_relacionado_id(codigo)');

      const { data: combosData } = await supabase
        .from('combos_cerrados')
        .select('servicio_disparador, combinacion');

      if (servicios) setCatalogo(servicios);
      if (reglasData) {
        setReglas(
          reglasData.map((r: any) => ({
            servicio_codigo: r.servicio?.codigo,
            relacionado_codigo: r.relacionado?.codigo,
            tipo_regla: r.tipo_regla,
          }))
        );
      }
      if (combosData) setCombosCerrados(combosData as ComboCerrado[]);
      setCargando(false);
    }
    cargar();
  }, []);

  function validarSeleccion(nuevosSeleccionados: string[]): string | null {
    // Reglas de excluye/requiere (en ambas direcciones)
    for (const regla of reglas) {
      const tieneOrigen = nuevosSeleccionados.includes(regla.servicio_codigo);
      const tieneRelacionado = nuevosSeleccionados.includes(regla.relacionado_codigo);

      if (regla.tipo_regla === 'excluye' && tieneOrigen && tieneRelacionado) {
        return `${regla.servicio_codigo} y ${regla.relacionado_codigo} no pueden contratarse juntos`;
      }
      if (regla.tipo_regla === 'requiere' && tieneOrigen && !tieneRelacionado) {
        return `${regla.servicio_codigo} requiere que también se contrate ${regla.relacionado_codigo}`;
      }
    }

    // Combo cerrado (GF): si está seleccionado, la selección completa debe calzar EXACTO con uno de los combos válidos
    if (nuevosSeleccionados.includes('GF')) {
      const combosGF = combosCerrados.filter((c) => c.servicio_disparador === 'GF');
      const coincide = combosGF.some((combo) => {
        const a = [...combo.combinacion].sort();
        const b = [...nuevosSeleccionados].sort();
        return a.length === b.length && a.every((v, i) => v === b[i]);
      });
      if (!coincide) {
        const opciones = combosGF.map((c) => c.combinacion.join(' + ')).join('  ·  ');
        return `GF solo es válido en una de estas combinaciones exactas: ${opciones}`;
      }
    }

    return null;
  }

  function toggleServicio(codigo: string) {
    const yaEsta = seleccionados.includes(codigo);
    const nuevos = yaEsta ? seleccionados.filter((c) => c !== codigo) : [...seleccionados, codigo];

    const error = validarSeleccion(nuevos);
    if (error) {
      setErrorRegla(error);
      return;
    }
    setErrorRegla(null);
    onChangeSeleccionados(nuevos);

    // Si se está desmarcando, limpiamos sus datos guardados para que no queden
    // "fantasma" afectando a otros servicios (ej. BO leyendo documentos de un EF ya desmarcado)
    if (yaEsta) {
      onChangeDetalle(codigo, undefined);
    }
  }

  function renderFormularioServicio(codigo: string) {
    const props = {
      value: (detalles as any)[codigo],
      onChange: (valor: unknown) => onChangeDetalle(codigo, valor),
      detalles, // para que servicios como BO puedan leer datos de otros (sucursales de POS, etc.)
      seleccionados, // para saber qué servicios están contratados, independiente de si ya tienen datos guardados
    };

    switch (codigo) {
      case 'EF':
        return <FormEF {...props} />;
      case 'EFP':
        return <FormEFP {...props} />;
      case 'BO':
        return <FormBO {...props} />;
      case 'POS':
        return <FormPOS value={props.value} onChange={props.onChange} />;
      case 'POS BOX':
        return <FormPOSBox value={props.value} onChange={props.onChange} />;
      case 'DTE Prov':
        return <FormDteProv value={props.value} onChange={props.onChange} />;
      case 'REC AV':
        return <FormRecAv value={props.value} onChange={props.onChange} />;
      case 'INV':
        return <FormINV />;
      case 'GF':
        return <FormGF />;
      default:
        return <FormEnConstruccion codigo={codigo} />;
    }
  }

  if (cargando) {
    return <Typography sx={{ color: 'text.secondary' }}>Cargando catálogo de servicios...</Typography>;
  }

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        Selecciona los servicios que contrata la empresa
      </Typography>

      {errorRegla && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: '8px' }} onClose={() => setErrorRegla(null)}>
          {errorRegla}
        </Alert>
      )}

      <Grid container spacing={1.5} sx={{ mb: 1 }}>
        {catalogo.map((s) => {
          const Icono = ICONO_POR_CODIGO[s.codigo] ?? DescriptionOutlinedIcon;
          const color = COLOR_POR_GRUPO[s.grupo] ?? '#8B84A3';
          const activo = seleccionados.includes(s.codigo);
          return (
            <Grid key={s.codigo} size={{ xs: 6, sm: 4, md: 3 }}>
              <Card
                onClick={() => toggleServicio(s.codigo)}
                sx={{
                  position: 'relative',
                  p: 2,
                  cursor: 'pointer',
                  borderColor: activo ? color : 'divider',
                  borderWidth: activo ? '1.5px' : '1px',
                  bgcolor: activo ? `${color}0F` : 'background.paper',
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: color },
                }}
              >
                {activo && (
                  <CheckCircleIcon sx={{ position: 'absolute', top: 8, right: 8, fontSize: 18, color }} />
                )}
                <Box
                  sx={{
                    width: 34, height: 34, borderRadius: '9px', mb: 1.2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: `${color}1A`,
                  }}
                >
                  <Icono sx={{ fontSize: 18, color }} />
                </Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: 'text.primary', lineHeight: 1.2 }}>
                  {s.codigo}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.3, mt: 0.2 }}>
                  {s.nombre}
                </Typography>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {seleccionados.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
            Configuración de cada servicio contratado
          </Typography>
          {seleccionados.map((codigo) => (
            <Accordion key={codigo} sx={{ mb: 1, '&:before': { display: 'none' } }} disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Chip label={codigo} size="small" sx={{ fontWeight: 700, mr: 1.5, fontFamily: 'monospace' }} />
                <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
                  {catalogo.find((c) => c.codigo === codigo)?.nombre}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>{renderFormularioServicio(codigo)}</AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
}