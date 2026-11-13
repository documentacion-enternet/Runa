import { Box, Typography, RadioGroup, FormControlLabel, Radio, Checkbox, Divider, Chip, Switch, TextField, IconButton, Button, FormControl, FormLabel } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DeleteOutlined as DeleteOutlineIcon } from '@mui/icons-material';
import type { DetalleEFP, DocumentoSeleccionado, DetallesServicios, Canal } from '../servicios-types';
import { DOCUMENTOS_NACIONALES, DOCUMENTOS_EXPORTACION } from '../servicios-types';
import { IntegracionSection, valorInicialIntegracion } from './IntegracionSection';

const NOMBRES_DOC: Record<string, string> = {
  '33': 'Factura Afecta', '34': 'Factura Exenta', '39': 'Boleta Afecta', '41': 'Boleta Exenta',
  '43': 'Liquidación de Factura', '46': 'Factura de Compra', '52': 'Guía de Despacho',
  '56': 'Nota de Débito', '61': 'Nota de Crédito',
  '110': 'Factura de Exportación', '111': 'Nota de Débito de Exportación', '112': 'Nota de Crédito de Exportación',
};

const valorInicial = (): DetalleEFP => ({
  documentos: [],
  modoFirma: 'Controlada',
  integracion: valorInicialIntegracion(),
  tieneSucursales: false,
  sucursales: [],
  tipoFolios: '',
  terminalId: '',
});

type Props = {
  value?: DetalleEFP;
  onChange: (v: DetalleEFP) => void;
  detalles: DetallesServicios;
  seleccionados: string[];
};

export function FormEFP({ value, onChange, seleccionados }: Props) {
  const v: DetalleEFP = {
    ...valorInicial(),
    ...value,
    integracion: { ...valorInicialIntegracion(), ...(value?.integracion ?? {}) },
  };
  const tieneBO = seleccionados.includes('BO');

  const sucursales = v.sucursales ?? [];
  const tieneSucursales = v.tieneSucursales ?? false;
  const tipoFolios = v.tipoFolios ?? '';
  const terminalId = v.terminalId ?? '';

  function actualizar(cambios: Partial<DetalleEFP>) {
    onChange({ ...v, ...cambios });
  }

  function toggleDocumento(codigo: string) {
    const existe = v.documentos.find((d) => d.codigo === codigo);
    if (existe) {
      actualizar({ documentos: v.documentos.filter((d) => d.codigo !== codigo) });
    } else {
      const nuevo: DocumentoSeleccionado = { codigo, almacenaEn: ['EFP'], canales: ['nativo'] };
      actualizar({ documentos: [...v.documentos, nuevo] });
    }
  }

  function toggleAlmacenamiento(codigo: string, lugar: 'EFP' | 'BO') {
    const doc = v.documentos.find((d) => d.codigo === codigo);
    if (!doc) return;
    const tiene = doc.almacenaEn.includes(lugar);
    const nuevoAlmacenaEn = tiene ? doc.almacenaEn.filter((l) => l !== lugar) : [...doc.almacenaEn, lugar];
    if (nuevoAlmacenaEn.length === 0) return;
    actualizarDocumento(codigo, { almacenaEn: nuevoAlmacenaEn });
  }

  function actualizarDocumento(codigo: string, cambios: Partial<DocumentoSeleccionado>) {
    actualizar({
      documentos: v.documentos.map((d) => (d.codigo === codigo ? { ...d, ...cambios } : d)),
    });
  }

  function toggleCanal(codigo: string, canal: Canal) {
    const doc = v.documentos.find((d) => d.codigo === codigo);
    if (!doc) return;
    const tiene = doc.canales.includes(canal);
    actualizarDocumento(codigo, {
      canales: tiene ? doc.canales.filter((c) => c !== canal) : [...doc.canales, canal],
    });
  }

  // ── Sucursales ──────────────────────────────────────────────────────────────
  function toggleSucursales(val: boolean) {
    actualizar({
      tieneSucursales: val,
      sucursales: val && sucursales.length === 0 ? [''] : sucursales,
    });
  }

  function agregarSucursal() {
    actualizar({ sucursales: [...sucursales, ''] });
  }

  function actualizarSucursal(i: number, valor: string) {
    const nueva = [...sucursales];
    nueva[i] = valor;
    actualizar({ sucursales: nueva });
  }

  function eliminarSucursal(i: number) {
    const nueva = sucursales.filter((_, j) => j !== i);
    actualizar({ sucursales: nueva.length === 0 ? [''] : nueva });
  }

  const tieneEmisionNativa = v.documentos.some((d) => d.canales.includes('nativo'));

  const canalesDisponibles: { key: Canal; label: string }[] = [
    { key: 'nativo', label: 'EFP' },
    ...(v.integracion.tieneIntegracion && v.integracion.batch ? [{ key: 'BATCH' as Canal, label: 'BATCH' }] : []),
    ...(v.integracion.tieneIntegracion && v.integracion.tipoTransmision !== 'ninguno'
      ? [{ key: v.integracion.tipoTransmision as Canal, label: v.integracion.tipoTransmision.replace('_', ' ') }]
      : []),
  ];

  return (
    <Box>
      <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 2 }}>
        Nota: EFP siempre contrata Back Office (BO) de forma obligatoria.
      </Typography>

      {/* Tipo de DTE */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Tipo de DTE — Documentos Nacionales</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
        {DOCUMENTOS_NACIONALES.map((codigo) => (
          <FormControlLabel
            key={codigo}
            sx={{ mr: 1 }}
            control={
              <Checkbox size="small" checked={!!v.documentos.find((d) => d.codigo === codigo)} onChange={() => toggleDocumento(codigo)} />
            }
            label={<Typography sx={{ fontSize: 12.5 }}>({codigo}) {NOMBRES_DOC[codigo]}</Typography>}
          />
        ))}
      </Box>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>Documentos de Exportación</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
        {DOCUMENTOS_EXPORTACION.map((codigo) => (
          <FormControlLabel
            key={codigo}
            sx={{ mr: 1 }}
            control={
              <Checkbox size="small" checked={!!v.documentos.find((d) => d.codigo === codigo)} onChange={() => toggleDocumento(codigo)} />
            }
            label={<Typography sx={{ fontSize: 12.5 }}>({codigo}) {NOMBRES_DOC[codigo]}</Typography>}
          />
        ))}
      </Box>

      {/* Por cada documento marcado: dónde reserva + canales */}
      {v.documentos.length > 0 && (
        <Box sx={{ mb: 3, pl: 1, borderLeft: '2px solid #EAE5F5' }}>
          <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', mb: 1, ml: 1 }}>
            Reserva y canal de emisión por documento
          </Typography>
          {v.documentos.map((doc) => (
            <Box key={doc.codigo} sx={{ mb: 2, ml: 1 }}>
              <Chip label={`(${doc.codigo}) ${NOMBRES_DOC[doc.codigo]}`} size="small" sx={{ mb: 1, fontSize: 11 }} />
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                {/* Bloque: Reserva del folio */}
                <Box sx={{ border: '1px solid #EAE5F5', borderRadius: '8px', p: 1.2, bgcolor: '#FAF8FD', flex: '1 1 220px' }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.5 }}>
                    Reserva del folio
                  </Typography>
                  {tieneBO ? (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <FormControlLabel
                        control={<Checkbox size="small" checked={doc.almacenaEn.includes('EFP')} onChange={() => toggleAlmacenamiento(doc.codigo, 'EFP')} />}
                        label={<Typography sx={{ fontSize: 12 }}>EFP</Typography>}
                      />
                      <FormControlLabel
                        control={<Checkbox size="small" checked={doc.almacenaEn.includes('BO')} onChange={() => toggleAlmacenamiento(doc.codigo, 'BO')} />}
                        label={<Typography sx={{ fontSize: 12 }}>BO</Typography>}
                      />
                    </Box>
                  ) : (
                    <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>EFP</Typography>
                  )}
                </Box>

                {/* Bloque: Canal de emisión */}
                <Box sx={{ border: '1px solid #EAE5F5', borderRadius: '8px', p: 1.2, bgcolor: 'background.paper', flex: '1 1 220px' }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.5 }}>
                    Canal de emisión
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {canalesDisponibles.map((c) => (
                      <FormControlLabel
                        key={c.key}
                        sx={{ mr: 0.5 }}
                        control={
                          <Checkbox size="small" checked={doc.canales.includes(c.key)} onChange={() => toggleCanal(doc.codigo, c.key)} />
                        }
                        label={<Typography sx={{ fontSize: 11.5 }}>{c.label}</Typography>}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Bloque: Modo de firma — solo si NO se emite por el canal nativo EFP */}
                {doc.canales.length > 0 && !doc.canales.includes('nativo') && (
                  <Box sx={{ border: '1px solid #EAE5F5', borderRadius: '8px', p: 1.2, bgcolor: '#FAF8FD', flex: '1 1 220px' }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.5 }}>
                      Modo de firma (solo integración)
                    </Typography>
                    <RadioGroup
                      row
                      value={doc.modoFirma ?? 'controlada'}
                      onChange={(e) => actualizarDocumento(doc.codigo, { modoFirma: e.target.value as 'controlada' | 'ciega' })}
                    >
                      <FormControlLabel value="controlada" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>Controlada</Typography>} />
                      <FormControlLabel value="ciega" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>Ciega</Typography>} />
                    </RadioGroup>
                  </Box>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {tieneEmisionNativa && (
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>
          Modo de firma (emisión nativa EFP): <strong>Controlada</strong>
        </Typography>
      )}

      {/* Integración */}
      <IntegracionSection value={v.integracion} onChange={(integracion) => actualizar({ integracion })} />

      {/* ── Sucursales ──────────────────────────────────────────── */}
      <Divider sx={{ my: 3 }} />

      <Box sx={{ mb: 1 }}>
        <FormControlLabel
          control={
            <Switch
              checked={tieneSucursales}
              onChange={(e) => toggleSucursales(e.target.checked)}
              size="small"
            />
          }
          label={<Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>¿Tiene sucursales?</Typography>}
        />
      </Box>

      {tieneSucursales && (
        <Box sx={{ pl: 1, mb: 2 }}>
          <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 1.5 }}>
            Agrega el nombre de cada sucursal habilitada para EFP.
          </Typography>
          {sucursales.map((nombre, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
              <TextField
                label={`Sucursal ${i + 1}`}
                value={nombre}
                onChange={(e) => actualizarSucursal(i, e.target.value)}
                size="small"
                sx={{ flexGrow: 1 }}
              />
              <IconButton
                onClick={() => eliminarSucursal(i)}
                size="small"
                disabled={sucursales.length === 1 && i === 0}
              >
                <DeleteOutlineIcon
                  fontSize="small"
                  sx={{ color: sucursales.length === 1 && i === 0 ? 'text.disabled' : 'error.main' }}
                />
              </IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={agregarSucursal} size="small" sx={{ mt: 0.5 }}>
            Agregar sucursal
          </Button>
        </Box>
      )}

      {/* ── Folios ──────────────────────────────────────────────── */}
      <Box sx={{ mt: tieneSucursales ? 1 : 2 }}>
        <FormControl>
          <FormLabel
            sx={{
              fontSize: 13.5, fontWeight: 600, color: 'text.primary', mb: 1,
              '&.Mui-focused': { color: 'text.primary' },
            }}
          >
            ¿Reserva Folios o Centraliza Folios?
          </FormLabel>
          <RadioGroup
            row
            value={tipoFolios}
            onChange={(e) => actualizar({ tipoFolios: e.target.value as 'reserva' | 'centraliza' | '' })}
          >
            <FormControlLabel
              value="reserva"
              control={<Radio size="small" />}
              label={<Typography sx={{ fontSize: 13.5 }}>Reserva Folios</Typography>}
            />
            <FormControlLabel
              value="centraliza"
              control={<Radio size="small" />}
              label={<Typography sx={{ fontSize: 13.5 }}>Centraliza Folios</Typography>}
            />
          </RadioGroup>
        </FormControl>

        {tipoFolios && (
          <TextField
            label="Terminal ID"
            value={terminalId}
            onChange={(e) => actualizar({ terminalId: e.target.value })}
            size="small"
            sx={{ mt: 1.5, maxWidth: 320, display: 'block' }}
            helperText="Identificador del terminal asociado a los folios"
          />
        )}
      </Box>
    </Box>
  );
}