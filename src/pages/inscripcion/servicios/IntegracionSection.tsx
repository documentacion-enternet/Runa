import { useEffect } from 'react';
import {
  Box, Typography, RadioGroup, FormControlLabel, Radio, Checkbox, TextField, Divider,
  IconButton, Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DeleteOutlined as DeleteOutlineIcon } from '@mui/icons-material';
import type { IntegracionConfig } from '../servicios-types';

const TIPOS_INSTALACION_COMPLETO = ['ENTER-PRINT', 'V19', 'V21', 'V23', 'V25'] as const;

export const valorInicialIntegracion = (): IntegracionConfig => ({
  tieneIntegracion: false,
  batch: false,
  batchConfig: {
    tipoInstalacion: 'ENTER-PRINT',
    respaldoConfigLink: '',
    dispositivoId: '',
    camLink: '',
    csvProduccionLink: '',
    tieneSucursal: false,
    nombreIdSucursal: '',
  },
  tipoTransmision: 'ninguno',
  wsConfig: { endpoint: '', getEstado: '', formatoEnvio: 'REQUEST', jks: false, firma: 'ciega' },
  wsLocalConfig: {
    tipoInstalacion: 'V23',
    dispositivoId: '',
    xslLocal: false,
    endpoint: 'http://localhost:8091/AgenteWS/servlet/com.enternetagentews.controlador.awssoapagentevisual?wsdl',
    formatoEnvio: 'REQUEST',
    firma: 'ciega',
  },
  txtV5Config: {
    tipoInstalacion: 'ENTER-PRINT',
    dispositivosId: [],
    xslLocal: false,
    xslLocalArchivoLink: '',
    xslWebLink: '',
    reservaFolios: false,
    modoFirma: 'controlada',
    jks: false,
  },
  txtCustomConfig: {
    miraplacid: false,
    parser: 'par_id',
    tipoInstalacion: 'ENTER-PRINT',
    dispositivosId: [],
    xslLocal: false,
    xslLocalArchivoLink: '',
    xslWebLink: '',
    reservaFolios: false,
    modoFirma: 'controlada',
    jks: false,
  },
});

type Props = {
  value: IntegracionConfig;
  onChange: (v: IntegracionConfig) => void;
};

export function IntegracionSection({ value, onChange }: Props) {
  const defaults = valorInicialIntegracion();
  const vBatch = value?.batchConfig as any;
  const vWs = value?.wsConfig as any;
  const vWsLocal = value?.wsLocalConfig as any;
  const vTxtV5 = value?.txtV5Config as any;
  const vTxtCustom = value?.txtCustomConfig as any;

  const v: IntegracionConfig = {
    tieneIntegracion: value?.tieneIntegracion ?? defaults.tieneIntegracion,
    batch: value?.batch ?? defaults.batch,
    tipoTransmision: value?.tipoTransmision ?? defaults.tipoTransmision,
    // Cada campo se reconstruye explícitamente (en vez de copiar el objeto guardado tal cual),
    // así cualquier campo viejo que ya no exista en el modelo actual queda descartado solo.
    batchConfig: {
      tipoInstalacion: vBatch?.tipoInstalacion ?? defaults.batchConfig.tipoInstalacion,
      respaldoConfigLink: vBatch?.respaldoConfigLink ?? defaults.batchConfig.respaldoConfigLink,
      dispositivoId: vBatch?.dispositivoId ?? defaults.batchConfig.dispositivoId,
      camLink: vBatch?.camLink ?? defaults.batchConfig.camLink,
      csvProduccionLink: vBatch?.csvProduccionLink ?? defaults.batchConfig.csvProduccionLink,
      tieneSucursal: vBatch?.tieneSucursal ?? defaults.batchConfig.tieneSucursal,
      nombreIdSucursal: vBatch?.nombreIdSucursal ?? defaults.batchConfig.nombreIdSucursal,
    },
    wsConfig: {
      endpoint: vWs?.endpoint ?? defaults.wsConfig.endpoint,
      getEstado: vWs?.getEstado ?? defaults.wsConfig.getEstado,
      formatoEnvio: vWs?.formatoEnvio ?? defaults.wsConfig.formatoEnvio,
      jks: vWs?.jks ?? defaults.wsConfig.jks,
      firma: 'ciega',
    },
    wsLocalConfig: {
      tipoInstalacion: vWsLocal?.tipoInstalacion ?? defaults.wsLocalConfig.tipoInstalacion,
      dispositivoId: vWsLocal?.dispositivoId ?? defaults.wsLocalConfig.dispositivoId,
      xslLocal: vWsLocal?.xslLocal ?? defaults.wsLocalConfig.xslLocal,
      endpoint: vWsLocal?.endpoint ?? defaults.wsLocalConfig.endpoint,
      formatoEnvio: vWsLocal?.formatoEnvio ?? defaults.wsLocalConfig.formatoEnvio,
      firma: 'ciega',
    },
    txtV5Config: {
      tipoInstalacion: vTxtV5?.tipoInstalacion ?? defaults.txtV5Config.tipoInstalacion,
      // Migración: si existe el campo viejo "dispositivoId" (texto único) y la lista nueva está vacía,
      // se convierte en el primer elemento de la lista — no se pierde el dato ya cargado.
      dispositivosId:
        vTxtV5?.dispositivosId?.length > 0
          ? vTxtV5.dispositivosId
          : vTxtV5?.dispositivoId
          ? [vTxtV5.dispositivoId]
          : defaults.txtV5Config.dispositivosId,
      xslLocal: vTxtV5?.xslLocal ?? defaults.txtV5Config.xslLocal,
      xslLocalArchivoLink: vTxtV5?.xslLocalArchivoLink ?? defaults.txtV5Config.xslLocalArchivoLink,
      xslWebLink: vTxtV5?.xslWebLink ?? defaults.txtV5Config.xslWebLink,
      reservaFolios: vTxtV5?.reservaFolios ?? defaults.txtV5Config.reservaFolios,
      modoFirma: vTxtV5?.modoFirma ?? defaults.txtV5Config.modoFirma,
      jks: vTxtV5?.jks ?? defaults.txtV5Config.jks,
    },
    txtCustomConfig: {
      miraplacid: vTxtCustom?.miraplacid ?? defaults.txtCustomConfig.miraplacid,
      parser: vTxtCustom?.parser ?? defaults.txtCustomConfig.parser,
      tipoInstalacion: vTxtCustom?.tipoInstalacion ?? defaults.txtCustomConfig.tipoInstalacion,
      dispositivosId: vTxtCustom?.dispositivosId?.length > 0 ? vTxtCustom.dispositivosId : defaults.txtCustomConfig.dispositivosId,
      xslLocal: vTxtCustom?.xslLocal ?? defaults.txtCustomConfig.xslLocal,
      xslLocalArchivoLink: vTxtCustom?.xslLocalArchivoLink ?? defaults.txtCustomConfig.xslLocalArchivoLink,
      xslWebLink: vTxtCustom?.xslWebLink ?? defaults.txtCustomConfig.xslWebLink,
      reservaFolios: vTxtCustom?.reservaFolios ?? defaults.txtCustomConfig.reservaFolios,
      modoFirma: vTxtCustom?.modoFirma ?? defaults.txtCustomConfig.modoFirma,
      jks: vTxtCustom?.jks ?? defaults.txtCustomConfig.jks,
    },
  };

  function actualizar(cambios: Partial<IntegracionConfig>) {
    onChange({ ...v, ...cambios });
  }

  function agregarDispositivoTxtV5() {
    actualizar({ txtV5Config: { ...v.txtV5Config, dispositivosId: [...v.txtV5Config.dispositivosId, ''] } });
  }

  function actualizarDispositivoTxtV5(index: number, valor: string) {
    const copia = [...v.txtV5Config.dispositivosId];
    copia[index] = valor;
    actualizar({ txtV5Config: { ...v.txtV5Config, dispositivosId: copia } });
  }

  function eliminarDispositivoTxtV5(index: number) {
    actualizar({ txtV5Config: { ...v.txtV5Config, dispositivosId: v.txtV5Config.dispositivosId.filter((_, i) => i !== index) } });
  }

  function agregarDispositivoTxtCustom() {
    actualizar({ txtCustomConfig: { ...v.txtCustomConfig, dispositivosId: [...v.txtCustomConfig.dispositivosId, ''] } });
  }

  function actualizarDispositivoTxtCustom(index: number, valor: string) {
    const copia = [...v.txtCustomConfig.dispositivosId];
    copia[index] = valor;
    actualizar({ txtCustomConfig: { ...v.txtCustomConfig, dispositivosId: copia } });
  }

  function eliminarDispositivoTxtCustom(index: number) {
    actualizar({ txtCustomConfig: { ...v.txtCustomConfig, dispositivosId: v.txtCustomConfig.dispositivosId.filter((_, i) => i !== index) } });
  }

  // Si el dato guardado venía incompleto (campos agregados después, como "firma"),
  // sincroniza automáticamente la versión completa hacia el estado del formulario,
  // aunque el usuario no toque ningún campo.
  useEffect(() => {
    if (JSON.stringify(v) !== JSON.stringify(value)) {
      onChange(v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const esInstalacionAntigua = ['ENTER-PRINT', 'V19', 'V21'].includes(v.batchConfig.tipoInstalacion);
  const esV23oV25 = ['V23', 'V25'].includes(v.batchConfig.tipoInstalacion);
  const esV25 = v.batchConfig.tipoInstalacion === 'V25';

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Integración</Typography>
      <RadioGroup
        row
        value={v.tieneIntegracion ? 'si' : 'no'}
        onChange={(e) => actualizar({ tieneIntegracion: e.target.value === 'si' })}
        sx={{ mb: 1.5 }}
      >
        <FormControlLabel value="si" control={<Radio size="small" />} label="Sí" />
        <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
      </RadioGroup>

      {v.tieneIntegracion && (
        <Box sx={{ pl: 1, borderLeft: '2px solid #EAE5F5', ml: 1 }}>
          {/* BATCH */}
          <FormControlLabel
            control={<Checkbox size="small" checked={v.batch} onChange={(e) => actualizar({ batch: e.target.checked })} />}
            label={<Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>BATCH</Typography>}
          />

          {v.batch && (
            <Box sx={{ pl: 3, mb: 2 }}>
              <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.7 }}>Tipo de instalación</Typography>
              <RadioGroup
                row
                value={v.batchConfig.tipoInstalacion}
                onChange={(e) => actualizar({ batchConfig: { ...v.batchConfig, tipoInstalacion: e.target.value as any } })}
                sx={{ mb: 1.5 }}
              >
                {TIPOS_INSTALACION_COMPLETO.map((t) => (
                  <FormControlLabel key={t} value={t} control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>{t}</Typography>} />
                ))}
              </RadioGroup>

              {esInstalacionAntigua && (
                <TextField
                  size="small" fullWidth label="Link respaldo Config.xml (Drive)"
                  value={v.batchConfig.respaldoConfigLink}
                  onChange={(e) => actualizar({ batchConfig: { ...v.batchConfig, respaldoConfigLink: e.target.value } })}
                  sx={{ mb: 1.5, maxWidth: 420 }}
                />
              )}

              {esV23oV25 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, mb: 1.5 }}>
                  <TextField
                    size="small" label="Dispositivo ID"
                    value={v.batchConfig.dispositivoId}
                    onChange={(e) => actualizar({ batchConfig: { ...v.batchConfig, dispositivoId: e.target.value } })}
                    sx={{ maxWidth: 280 }}
                  />
                  <TextField
                    size="small" fullWidth label="Link CAM (archivo .csv)"
                    value={v.batchConfig.camLink}
                    onChange={(e) => actualizar({ batchConfig: { ...v.batchConfig, camLink: e.target.value } })}
                    sx={{ maxWidth: 420 }}
                  />
                  <TextField
                    size="small" fullWidth label="Link CSV en producción"
                    value={v.batchConfig.csvProduccionLink}
                    onChange={(e) => actualizar({ batchConfig: { ...v.batchConfig, csvProduccionLink: e.target.value } })}
                    sx={{ maxWidth: 420 }}
                  />
                </Box>
              )}

              {esV25 && (
                <Box>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.5 }}>¿Sucursal?</Typography>
                  <RadioGroup
                    row
                    value={v.batchConfig.tieneSucursal ? 'si' : 'no'}
                    onChange={(e) => actualizar({ batchConfig: { ...v.batchConfig, tieneSucursal: e.target.value === 'si' } })}
                    sx={{ mb: 1 }}
                  >
                    <FormControlLabel value="si" control={<Radio size="small" />} label="Sí" />
                    <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
                  </RadioGroup>
                  {v.batchConfig.tieneSucursal && (
                    <TextField
                      size="small" label="Nombre ID"
                      value={v.batchConfig.nombreIdSucursal}
                      onChange={(e) => actualizar({ batchConfig: { ...v.batchConfig, nombreIdSucursal: e.target.value } })}
                      sx={{ maxWidth: 280 }}
                    />
                  )}
                </Box>
              )}
            </Box>
          )}

          <Divider sx={{ my: 1.5 }} />

          <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.7 }}>
            Canal de transmisión (uno solo, no se combinan entre sí)
          </Typography>
          <RadioGroup
            value={v.tipoTransmision}
            onChange={(e) => actualizar({ tipoTransmision: e.target.value as any })}
            sx={{ mb: 1.5 }}
          >
            <FormControlLabel value="ninguno" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12.5 }}>Ninguno</Typography>} />
            <FormControlLabel value="WS" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12.5 }}>WS</Typography>} />
            <FormControlLabel value="WS_LOCAL" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12.5 }}>WS Local</Typography>} />
            <FormControlLabel value="TXT_V5" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12.5 }}>TXT V5</Typography>} />
            <FormControlLabel value="TXT_CUSTOM" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12.5 }}>TXT Custom</Typography>} />
          </RadioGroup>

          {/* WS */}
          {v.tipoTransmision === 'WS' && (
            <Box sx={{ pl: 2, mb: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              <TextField
                size="small" fullWidth label="Endpoint"
                value={v.wsConfig.endpoint}
                onChange={(e) => actualizar({ wsConfig: { ...v.wsConfig, endpoint: e.target.value } })}
                sx={{ maxWidth: 420 }}
              />
              <TextField
                size="small" fullWidth label="GET Estado"
                value={v.wsConfig.getEstado}
                onChange={(e) => actualizar({ wsConfig: { ...v.wsConfig, getEstado: e.target.value } })}
                sx={{ maxWidth: 420 }}
              />
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.5 }}>Formato de envío</Typography>
                <RadioGroup
                  row
                  value={v.wsConfig.formatoEnvio}
                  onChange={(e) => actualizar({ wsConfig: { ...v.wsConfig, formatoEnvio: e.target.value as any } })}
                >
                  {['REQUEST', 'TXT', 'XML'].map((f) => (
                    <FormControlLabel key={f} value={f} control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>{f}</Typography>} />
                  ))}
                </RadioGroup>
              </Box>
              <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>Firma: <strong>Ciega</strong> (fija)</Typography>
              <FormControlLabel
                control={<Checkbox size="small" checked={v.wsConfig.jks} onChange={(e) => actualizar({ wsConfig: { ...v.wsConfig, jks: e.target.checked } })} />}
                label={<Typography sx={{ fontSize: 12.5 }}>JKS</Typography>}
              />
            </Box>
          )}

          {/* WS LOCAL */}
          {v.tipoTransmision === 'WS_LOCAL' && (
            <Box sx={{ pl: 2, mb: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.5 }}>Tipo de instalación</Typography>
                <RadioGroup
                  row
                  value={v.wsLocalConfig.tipoInstalacion}
                  onChange={(e) => actualizar({ wsLocalConfig: { ...v.wsLocalConfig, tipoInstalacion: e.target.value as any } })}
                >
                  <FormControlLabel value="V23" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>V23</Typography>} />
                  <FormControlLabel value="V25" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>V25</Typography>} />
                </RadioGroup>
                <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mb: 1 }}>
                  Puede ser el mismo dispositivo usado para BATCH.
                </Typography>
                <TextField
                  size="small" label="Dispositivo ID"
                  value={v.wsLocalConfig.dispositivoId}
                  onChange={(e) => actualizar({ wsLocalConfig: { ...v.wsLocalConfig, dispositivoId: e.target.value } })}
                  sx={{ maxWidth: 280 }}
                />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.5 }}>¿XSL Local?</Typography>
                <RadioGroup
                  row
                  value={v.wsLocalConfig.xslLocal ? 'si' : 'no'}
                  onChange={(e) => actualizar({ wsLocalConfig: { ...v.wsLocalConfig, xslLocal: e.target.value === 'si' } })}
                >
                  <FormControlLabel value="si" control={<Radio size="small" />} label="Sí" />
                  <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
                </RadioGroup>
              </Box>
              <TextField
                size="small" fullWidth label="Endpoint"
                value={v.wsLocalConfig.endpoint}
                onChange={(e) => actualizar({ wsLocalConfig: { ...v.wsLocalConfig, endpoint: e.target.value } })}
                sx={{ maxWidth: 480 }}
              />
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.5 }}>Formato de envío</Typography>
                <RadioGroup
                  row
                  value={v.wsLocalConfig.formatoEnvio}
                  onChange={(e) => actualizar({ wsLocalConfig: { ...v.wsLocalConfig, formatoEnvio: e.target.value as any } })}
                >
                  <FormControlLabel value="REQUEST" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>REQUEST</Typography>} />
                  <FormControlLabel value="JSON" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>JSON</Typography>} />
                </RadioGroup>
              </Box>
              <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>Firma: <strong>Ciega</strong> (fija)</Typography>
            </Box>
          )}

          {/* TXT V5 */}
          {v.tipoTransmision === 'TXT_V5' && (
            <Box sx={{ pl: 2, mb: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.5 }}>Tipo de instalación</Typography>
                <RadioGroup
                  row
                  value={v.txtV5Config.tipoInstalacion}
                  onChange={(e) => actualizar({ txtV5Config: { ...v.txtV5Config, tipoInstalacion: e.target.value as any } })}
                >
                  {TIPOS_INSTALACION_COMPLETO.map((t) => (
                    <FormControlLabel key={t} value={t} control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>{t}</Typography>} />
                  ))}
                </RadioGroup>
                {['ENTER-PRINT', 'V19'].includes(v.txtV5Config.tipoInstalacion) && (
                  <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>Respaldo disponible en Google Sheet.</Typography>
                )}
                {['V23', 'V25'].includes(v.txtV5Config.tipoInstalacion) && (
                  <Box sx={{ mt: 1 }}>
                    <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mb: 1 }}>
                      Puede ser el mismo dispositivo usado para BATCH. Puedes agregar más de uno.
                    </Typography>
                    {v.txtV5Config.dispositivosId.map((id, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <TextField
                          size="small" label={`Dispositivo ID ${i + 1}`}
                          value={id}
                          onChange={(e) => actualizarDispositivoTxtV5(i, e.target.value)}
                          sx={{ maxWidth: 280 }}
                        />
                        <IconButton size="small" onClick={() => eliminarDispositivoTxtV5(i)}>
                          <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
                        </IconButton>
                      </Box>
                    ))}
                    <Button startIcon={<AddIcon />} size="small" onClick={agregarDispositivoTxtV5}>
                      Agregar dispositivo
                    </Button>
                  </Box>
                )}
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.5 }}>¿XSL Local?</Typography>
                <RadioGroup
                  row
                  value={v.txtV5Config.xslLocal ? 'si' : 'no'}
                  onChange={(e) => actualizar({ txtV5Config: { ...v.txtV5Config, xslLocal: e.target.value === 'si' } })}
                >
                  <FormControlLabel value="si" control={<Radio size="small" />} label="Sí" />
                  <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
                </RadioGroup>
              </Box>
              {v.txtV5Config.xslLocal && (
                <TextField
                  size="small" fullWidth label="Link del archivo XSL Local"
                  value={v.txtV5Config.xslLocalArchivoLink}
                  onChange={(e) => actualizar({ txtV5Config: { ...v.txtV5Config, xslLocalArchivoLink: e.target.value } })}
                  sx={{ maxWidth: 420 }}
                />
              )}
              <TextField
                size="small" fullWidth label="XSL Web (link)"
                value={v.txtV5Config.xslWebLink}
                onChange={(e) => actualizar({ txtV5Config: { ...v.txtV5Config, xslWebLink: e.target.value } })}
                sx={{ maxWidth: 420 }}
              />
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.5 }}>¿Reserva folios?</Typography>
                <RadioGroup
                  row
                  value={v.txtV5Config.reservaFolios ? 'si' : 'no'}
                  onChange={(e) => actualizar({ txtV5Config: { ...v.txtV5Config, reservaFolios: e.target.value === 'si' } })}
                >
                  <FormControlLabel value="si" control={<Radio size="small" />} label="Sí" />
                  <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
                </RadioGroup>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.5 }}>Modo de firma</Typography>
                <RadioGroup
                  row
                  value={v.txtV5Config.modoFirma}
                  onChange={(e) => actualizar({ txtV5Config: { ...v.txtV5Config, modoFirma: e.target.value as any } })}
                >
                  <FormControlLabel value="controlada" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>Controlada</Typography>} />
                  <FormControlLabel value="ciega" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>Ciega</Typography>} />
                </RadioGroup>
              </Box>
              <FormControlLabel
                control={<Checkbox size="small" checked={v.txtV5Config.jks} onChange={(e) => actualizar({ txtV5Config: { ...v.txtV5Config, jks: e.target.checked } })} />}
                label={<Typography sx={{ fontSize: 12.5 }}>JKS</Typography>}
              />
            </Box>
          )}

          {/* TXT CUSTOM */}
          {v.tipoTransmision === 'TXT_CUSTOM' && (
            <Box sx={{ pl: 2, mb: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.5 }}>¿Miraplacid?</Typography>
                <RadioGroup
                  row
                  value={v.txtCustomConfig.miraplacid ? 'si' : 'no'}
                  onChange={(e) => actualizar({ txtCustomConfig: { ...v.txtCustomConfig, miraplacid: e.target.value === 'si' } })}
                >
                  <FormControlLabel value="si" control={<Radio size="small" />} label="Sí" />
                  <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
                </RadioGroup>
              </Box>

              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.5 }}>Parser</Typography>
                <RadioGroup
                  row
                  value={v.txtCustomConfig.parser}
                  onChange={(e) => actualizar({ txtCustomConfig: { ...v.txtCustomConfig, parser: e.target.value as any } })}
                >
                  <FormControlLabel value="par_id" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>Par ID</Typography>} />
                  <FormControlLabel value="texto_libre" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>Texto Libre</Typography>} />
                </RadioGroup>
              </Box>

              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.5 }}>Tipo de instalación</Typography>
                <RadioGroup
                  row
                  value={v.txtCustomConfig.tipoInstalacion}
                  onChange={(e) => actualizar({ txtCustomConfig: { ...v.txtCustomConfig, tipoInstalacion: e.target.value as any } })}
                >
                  {TIPOS_INSTALACION_COMPLETO.map((t) => (
                    <FormControlLabel key={t} value={t} control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>{t}</Typography>} />
                  ))}
                </RadioGroup>
                {['ENTER-PRINT', 'V19'].includes(v.txtCustomConfig.tipoInstalacion) && (
                  <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>Respaldo disponible en Google Sheet.</Typography>
                )}
                {['V23', 'V25'].includes(v.txtCustomConfig.tipoInstalacion) && (
                  <Box sx={{ mt: 1 }}>
                    <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mb: 1 }}>
                      Puede ser el mismo dispositivo usado para BATCH. Puedes agregar más de uno.
                    </Typography>
                    {v.txtCustomConfig.dispositivosId.map((id, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <TextField
                          size="small" label={`Dispositivo ID ${i + 1}`}
                          value={id}
                          onChange={(e) => actualizarDispositivoTxtCustom(i, e.target.value)}
                          sx={{ maxWidth: 280 }}
                        />
                        <IconButton size="small" onClick={() => eliminarDispositivoTxtCustom(i)}>
                          <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
                        </IconButton>
                      </Box>
                    ))}
                    <Button startIcon={<AddIcon />} size="small" onClick={agregarDispositivoTxtCustom}>
                      Agregar dispositivo
                    </Button>
                  </Box>
                )}
              </Box>

              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.5 }}>¿XSL Local?</Typography>
                <RadioGroup
                  row
                  value={v.txtCustomConfig.xslLocal ? 'si' : 'no'}
                  onChange={(e) => actualizar({ txtCustomConfig: { ...v.txtCustomConfig, xslLocal: e.target.value === 'si' } })}
                >
                  <FormControlLabel value="si" control={<Radio size="small" />} label="Sí" />
                  <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
                </RadioGroup>
              </Box>
              {v.txtCustomConfig.xslLocal && (
                <TextField
                  size="small" fullWidth label="Link del archivo XSL Local"
                  value={v.txtCustomConfig.xslLocalArchivoLink}
                  onChange={(e) => actualizar({ txtCustomConfig: { ...v.txtCustomConfig, xslLocalArchivoLink: e.target.value } })}
                  sx={{ maxWidth: 420 }}
                />
              )}
              <TextField
                size="small" fullWidth label="XSL Web (link)"
                value={v.txtCustomConfig.xslWebLink}
                onChange={(e) => actualizar({ txtCustomConfig: { ...v.txtCustomConfig, xslWebLink: e.target.value } })}
                sx={{ maxWidth: 420 }}
              />

              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.5 }}>¿Reserva folios?</Typography>
                <RadioGroup
                  row
                  value={v.txtCustomConfig.reservaFolios ? 'si' : 'no'}
                  onChange={(e) => actualizar({ txtCustomConfig: { ...v.txtCustomConfig, reservaFolios: e.target.value === 'si' } })}
                >
                  <FormControlLabel value="si" control={<Radio size="small" />} label="Sí" />
                  <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
                </RadioGroup>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.5 }}>Modo de firma</Typography>
                <RadioGroup
                  row
                  value={v.txtCustomConfig.modoFirma}
                  onChange={(e) => actualizar({ txtCustomConfig: { ...v.txtCustomConfig, modoFirma: e.target.value as any } })}
                >
                  <FormControlLabel value="controlada" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>Controlada</Typography>} />
                  <FormControlLabel value="ciega" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12 }}>Ciega</Typography>} />
                </RadioGroup>
              </Box>
              <FormControlLabel
                control={<Checkbox size="small" checked={v.txtCustomConfig.jks} onChange={(e) => actualizar({ txtCustomConfig: { ...v.txtCustomConfig, jks: e.target.checked } })} />}
                label={<Typography sx={{ fontSize: 12.5 }}>JKS</Typography>}
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}