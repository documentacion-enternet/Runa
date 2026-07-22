// src/components/DetalleServicioView.tsx
// Solo el componente. Constantes y helpers están en ./servicios-utils.ts
// (separado para que Vite Fast Refresh no se queje al mezclar exports de constantes con componentes React)

import { Box, Typography, Chip, Grid } from '@mui/material';
import { bonito, formatLabel, NOMBRES_DOC } from './servicios-utils';

// Re-exportamos lo que FichaEmpresa y FormularioInscripcion importan de este archivo,
// para no tener que cambiar sus imports — siguen apuntando a DetalleServicioView.
export { bonito, NOMBRES_DOC, computeDocumentosParaBO } from './servicios-utils';
export { SERVICIOS_INFO, ICONO_POR_CODIGO, COLOR_POR_GRUPO } from './servicios-utils';

function RenderValor({ valor }: { valor: unknown }) {
  if (valor === null || valor === undefined || valor === '') {
    return <span style={{ color: '#9C93B5' }}>—</span>;
  }
  if (typeof valor === 'boolean') {
    return (
      <Chip
        label={valor ? 'Sí' : 'No'}
        size="small"
        sx={{ height: 20, fontSize: 11, fontWeight: 600, bgcolor: valor ? 'rgba(94,156,122,0.15)' : 'rgba(139,132,163,0.12)', color: valor ? '#4C8467' : 'text.disabled' }}
      />
    );
  }
  if (Array.isArray(valor)) {
    if (valor.length === 0) return <span style={{ color: '#9C93B5' }}>—</span>;
    if (typeof valor[0] === 'object') {
      const columnas = Object.keys(valor[0] as Record<string, unknown>);
      return (
        <Box sx={{ border: '1px solid #EAE5F5', borderRadius: '8px', overflow: 'hidden', mt: 0.4 }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: '#FAF8FD' }}>
                {columnas.map((col) => (
                  <Box component="th" key={col} sx={{ textAlign: 'left', fontSize: 9.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', px: 1.2, py: 0.6, borderBottom: '1px solid #EAE5F5' }}>
                    {formatLabel(col)}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {valor.map((item, i) => (
                <Box component="tr" key={i}>
                  {columnas.map((col) => (
                    <Box component="td" key={col} sx={{ fontSize: 11.5, color: 'text.primary', px: 1.2, py: 0.7, borderBottom: '1px solid #F0ECF8' }}>
                      {String((item as Record<string, unknown>)[col] ?? '—')}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      );
    }
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.4 }}>
        {valor.map((v, i) => (
          <Chip key={i} label={bonito(String(v))} size="small" sx={{ height: 19, fontSize: 10.5, fontWeight: 600, bgcolor: 'rgba(122,107,176,0.1)', color: '#695A9E' }} />
        ))}
      </Box>
    );
  }
  if (typeof valor === 'object') {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.8, mt: 0.3 }}>
        {Object.entries(valor as Record<string, unknown>).map(([k, v]) => (
          <Box key={k}>
            <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {formatLabel(k)}
            </Typography>
            <Box sx={{ mt: 0.3 }}>
              {typeof v === 'boolean' ? (
                <Chip label={v ? 'Sí' : 'No'} size="small" sx={{ height: 19, fontSize: 10.5, fontWeight: 600, bgcolor: v ? 'rgba(94,156,122,0.15)' : 'rgba(139,132,163,0.12)', color: v ? '#4C8467' : 'text.disabled' }} />
              ) : v === null || v === '' || v === undefined ? (
                <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>—</Typography>
              ) : (
                <Chip label={bonito(String(v))} size="small" sx={{ height: 19, fontSize: 10.5, fontWeight: 600, bgcolor: 'rgba(122,107,176,0.1)', color: '#695A9E' }} />
              )}
            </Box>
          </Box>
        ))}
      </Box>
    );
  }
  return (
    <Chip
      label={bonito(String(valor))}
      size="small"
      sx={{ height: 20, fontSize: 11, fontWeight: 600, bgcolor: 'rgba(122,107,176,0.09)', color: '#695A9E' }}
    />
  );
}

function TablaTerminales({ filas, campoNombre, campoId }: { filas: any[]; campoNombre: string; campoId: string }) {
  const conScroll = filas.length > 6;
  return (
    <Box sx={{ border: '1px solid #EAE5F5', borderRadius: '8px', overflow: 'hidden' }}>
      <Box sx={{ maxHeight: conScroll ? 220 : 'none', overflowY: conScroll ? 'auto' : 'visible' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
          <Box component="thead" sx={{ position: 'sticky', top: 0 }}>
            <Box component="tr" sx={{ bgcolor: '#FAF8FD' }}>
              <Box component="th" sx={{ textAlign: 'left', fontSize: 9.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', px: 1.5, py: 0.8, borderBottom: '1px solid #EAE5F5' }}>
                Nombre
              </Box>
              <Box component="th" sx={{ textAlign: 'left', fontSize: 9.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', px: 1.5, py: 0.8, borderBottom: '1px solid #EAE5F5' }}>
                Terminal ID
              </Box>
              <Box component="th" sx={{ textAlign: 'left', fontSize: 9.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', px: 1.5, py: 0.8, borderBottom: '1px solid #EAE5F5' }}>
                Dispositivo ID
              </Box>
            </Box>
          </Box>
          <Box component="tbody">
            {filas.map((f, i) => (
              <Box component="tr" key={i} sx={{ '&:hover': { bgcolor: '#FCFBFE' } }}>
                <Box component="td" sx={{ fontSize: 12, fontWeight: 600, color: 'text.primary', px: 1.5, py: 0.9, borderBottom: '1px solid #F0ECF8' }}>
                  {f[campoNombre] || '—'}
                </Box>
                <Box component="td" sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: 'secondary.main', fontWeight: 600, px: 1.5, py: 0.9, borderBottom: '1px solid #F0ECF8' }}>
                  {f[campoId] || '—'}
                </Box>
                <Box component="td" sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: 'secondary.main', fontWeight: 600, px: 1.5, py: 0.9, borderBottom: '1px solid #F0ECF8' }}>
                  {f.dispositivoId || '—'}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function SeccionIntegracion({ integracion }: { integracion: any }) {
  if (!integracion?.tieneIntegracion) {
    return <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>No tiene integración configurada.</Typography>;
  }

  const partes: { titulo: string; datos: Record<string, unknown> }[] = [];
  if (integracion.batch && integracion.batchConfig) partes.push({ titulo: 'BATCH', datos: integracion.batchConfig });
  if (integracion.tipoTransmision === 'WS' && integracion.wsConfig) partes.push({ titulo: 'WS', datos: integracion.wsConfig });
  if (integracion.tipoTransmision === 'WS_LOCAL' && integracion.wsLocalConfig) partes.push({ titulo: 'WS Local', datos: integracion.wsLocalConfig });
  if (integracion.tipoTransmision === 'TXT_V5' && integracion.txtV5Config) partes.push({ titulo: 'TXT V5', datos: integracion.txtV5Config });
  if (integracion.tipoTransmision === 'TXT_CUSTOM' && integracion.txtCustomConfig) partes.push({ titulo: 'TXT Custom', datos: integracion.txtCustomConfig });

  if (partes.length === 0) {
    return <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Integración activada, sin canal ni BATCH configurados.</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {partes.map((p) => (
        <Box key={p.titulo} sx={{ border: '1px solid #EAE5F5', borderRadius: '10px', p: 1.4, bgcolor: '#FCFBFE' }}>
          <Chip label={p.titulo} size="small" sx={{ mb: 1, fontWeight: 700, fontSize: 11, bgcolor: 'rgba(122,107,176,0.12)', color: '#695A9E' }} />
          <Grid container spacing={1.2}>
            {Object.entries(p.datos)
              .filter(([, v]) => typeof v === 'boolean' || (v !== '' && v !== null && v !== undefined))
              .map(([k, val]) => (
                <Grid key={k} size={{ xs: 12, sm: 6 }}>
                  <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase' }}>
                    {formatLabel(k)}
                  </Typography>
                  <Box sx={{ mt: 0.3 }}>
                    <RenderValor valor={val} />
                  </Box>
                </Grid>
              ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}

function ChipsAlmacenamiento({ label, valores, tono, codigoServicio }: {
  label: string;
  valores: string[];
  tono: 'verde' | 'morado';
  codigoServicio?: string;
}) {
  const colores = tono === 'verde'
    ? { bg: 'rgba(94,156,122,0.13)', color: '#4C8467' }
    : { bg: 'rgba(122,107,176,0.12)', color: '#695A9E' };

  const etiquetaValor = (v: string) => {
    if (v === 'nativo') {
      if (codigoServicio === 'EF') return 'EF';
      if (codigoServicio === 'EFP') return 'EFP';
    }
    return bonito(v);
  };

  return (
    <Box>
      <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.4 }}>
        {valores.length === 0 ? (
          <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>—</Typography>
        ) : (
          valores.map((v) => (
            <Chip key={v} label={etiquetaValor(v)} size="small" sx={{ height: 19, fontSize: 10.5, fontWeight: 600, bgcolor: colores.bg, color: colores.color }} />
          ))
        )}
      </Box>
    </Box>
  );
}

export function DetalleServicioView({ codigo, nombreServicio, detalle, documentosCalculadosBO }: {
  codigo: string; nombreServicio: string; detalle: any; documentosCalculadosBO?: { codigo: string; origen: string }[];
}) {
  if (codigo === 'BO') {
    const { terminales, terminalesWSLocal, terminalesTxtV5, ...resto } = detalle ?? {};
    return (
      <Box>
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', mb: 1 }}>
            Documentos que almacena
          </Typography>
          {!documentosCalculadosBO || documentosCalculadosBO.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>No hay documentos asignados a Back Office.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
              {documentosCalculadosBO.map((d, i) => (
                <Chip
                  key={`${d.codigo}-${i}`}
                  label={`(${d.codigo}) ${NOMBRES_DOC[d.codigo] ?? d.codigo}`}
                  size="small"
                  sx={{ fontSize: 11, bgcolor: 'rgba(94,156,122,0.12)', color: '#4C8467', fontWeight: 500 }}
                />
              ))}
            </Box>
          )}
        </Box>

        {Array.isArray(terminales) && terminales.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', mb: 1 }}>
              Terminales por sucursal
            </Typography>
            <TablaTerminales filas={terminales} campoNombre="nombre" campoId="terminalId" />
          </Box>
        )}

        {Array.isArray(terminalesWSLocal) && terminalesWSLocal.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', mb: 1 }}>
              Terminales WS Local
            </Typography>
            <TablaTerminales filas={terminalesWSLocal} campoNombre="nombreTerminal" campoId="terminalId" />
          </Box>
        )}

        {Array.isArray(terminalesTxtV5) && terminalesTxtV5.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', mb: 1 }}>
              Terminales TXT V5
            </Typography>
            <TablaTerminales filas={terminalesTxtV5} campoNombre="nombreTerminal" campoId="terminalId" />
          </Box>
        )}

        {Object.keys(resto).length > 0 && (
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            {Object.entries(resto)
              .filter(([, v]) => !(Array.isArray(v) && v.length === 0))
              .map(([key, valor]) => {
                const esTabla = Array.isArray(valor) && valor.length > 0 && typeof valor[0] === 'object';
                return (
                  <Grid key={key} size={esTabla ? 12 : { xs: 12, sm: 6 }}>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase' }}>
                      {formatLabel(key)}
                    </Typography>
                    <Box sx={{ fontSize: 12.5, color: 'text.primary' }}>
                      <RenderValor valor={valor} />
                    </Box>
                  </Grid>
                );
              })}
          </Grid>
        )}
      </Box>
    );
  }

  if (!detalle || Object.keys(detalle).length === 0) {
    return (
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
        Empresa configurada con <strong>{nombreServicio}</strong>.
      </Typography>
    );
  }

  const { documentos, ...resto } = detalle;
  const documentosLimpios = Array.isArray(documentos)
    ? documentos.filter((d: any) => (typeof d === 'string' && d.trim() !== '') || (typeof d === 'object' && d?.codigo))
    : documentos;

  const esNativoRelevante = codigo !== 'EF' && codigo !== 'EFP';
  const tieneEmisionNativa =
    esNativoRelevante ||
    (Array.isArray(documentosLimpios) &&
      documentosLimpios.some((d: any) => typeof d === 'object' && Array.isArray(d.canales) && d.canales.includes('nativo')));

  return (
    <Box>
      {Array.isArray(documentosLimpios) && documentosLimpios.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', mb: 1 }}>
            Documentos
          </Typography>

          {typeof documentosLimpios[0] === 'string' ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
              {documentosLimpios.map((cod: string) => (
                <Chip key={cod} label={`(${cod}) ${NOMBRES_DOC[cod] ?? cod}`} size="small" sx={{ fontSize: 11, bgcolor: 'rgba(122,107,176,0.09)', color: '#695A9E', fontWeight: 500 }} />
              ))}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {documentosLimpios.map((d: any) => {
                const almacenaEn = Array.isArray(d.almacenaEn) ? d.almacenaEn : [d.almacenaEn].filter(Boolean);
                const canales = Array.isArray(d.canales) ? d.canales : [];
                return (
                  <Box key={d.codigo} sx={{ border: '1px solid #EAE5F5', borderRadius: '10px', p: 1.3, bgcolor: '#FCFBFE' }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.primary', mb: 0.8 }}>
                      ({d.codigo}) {NOMBRES_DOC[d.codigo] ?? d.codigo}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
                      <ChipsAlmacenamiento label="Reserva en" valores={almacenaEn} tono="verde" />
                      <ChipsAlmacenamiento label="Canal de emisión" valores={canales} tono="morado" codigoServicio={codigo} />
                      {!canales.includes('nativo') && d.modoFirma && (
                        <ChipsAlmacenamiento label="Modo de firma" valores={[d.modoFirma]} tono="morado" />
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      )}

      <Grid container spacing={1.5}>
        {Object.entries(resto)
          .filter(([, v]) => !(Array.isArray(v) && v.length === 0))
          .filter(([key]) => !(key === 'modoFirma' && !tieneEmisionNativa))
          .map(([key, valor]) => {
            if (key === 'integracion') {
              return (
                <Grid key={key} size={12}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', mb: 0.5 }}>
                    Integración
                  </Typography>
                  <SeccionIntegracion integracion={valor} />
                </Grid>
              );
            }
            const esTabla = Array.isArray(valor) && valor.length > 0 && typeof valor[0] === 'object';
            return (
              <Grid key={key} size={esTabla ? 12 : { xs: 12, sm: 6 }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase' }}>
                  {formatLabel(key)}
                </Typography>
                <Box sx={{ fontSize: 12.5, color: 'text.primary' }}>
                  <RenderValor valor={valor} />
                </Box>
              </Grid>
            );
          })}
      </Grid>
    </Box>
  );
}