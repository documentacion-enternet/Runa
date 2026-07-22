// Tipos compartidos para el Paso 4 (Servicios) del Formulario de Inscripción

export type Canal = 'nativo' | 'BATCH' | 'WS' | 'WS_LOCAL' | 'TXT_V5' | 'POS' | 'POS_BOX';

export type DocumentoSeleccionado = {
  codigo: string;
  almacenaEn: ('EF' | 'EFP' | 'BO')[];
  canales: Canal[];
  modoFirma?: 'controlada' | 'ciega';
};

export type BatchConfig = {
  tipoInstalacion: 'ENTER-PRINT' | 'V19' | 'V21' | 'V23' | 'V25';
  respaldoConfigLink: string;
  dispositivoId: string;
  camLink: string;
  csvProduccionLink: string;
  tieneSucursal: boolean;
  nombreIdSucursal: string;
};

export type WSConfig = {
  endpoint: string;
  getEstado: string;
  formatoEnvio: 'REQUEST' | 'TXT' | 'XML';
  jks: boolean;
  firma: 'ciega';
};

export type WSLocalConfig = {
  tipoInstalacion: 'V23' | 'V25';
  dispositivoId: string;
  xslLocal: boolean;
  endpoint: string;
  formatoEnvio: 'REQUEST' | 'JSON';
  firma: 'ciega';
};

export type TxtV5Config = {
  tipoInstalacion: 'ENTER-PRINT' | 'V19' | 'V21' | 'V23' | 'V25';
  dispositivosId: string[];
  xslLocal: boolean;
  xslLocalArchivoLink: string;
  xslWebLink: string;
  reservaFolios: boolean;
  modoFirma: 'controlada' | 'ciega';
  jks: boolean;
};

export type TxtCustomConfig = {
  miraplacid: boolean;
  parser: 'par_id' | 'texto_libre';
  tipoInstalacion: 'ENTER-PRINT' | 'V19' | 'V21' | 'V23' | 'V25';
  dispositivosId: string[];
  xslLocal: boolean;
  xslLocalArchivoLink: string;
  xslWebLink: string;
  reservaFolios: boolean;
  modoFirma: 'controlada' | 'ciega';
  jks: boolean;
};

export type IntegracionConfig = {
  tieneIntegracion: boolean;
  batch: boolean;
  batchConfig: BatchConfig;
  tipoTransmision: 'WS' | 'WS_LOCAL' | 'TXT_V5' | 'TXT_CUSTOM' | 'ninguno';
  wsConfig: WSConfig;
  wsLocalConfig: WSLocalConfig;
  txtV5Config: TxtV5Config;
  txtCustomConfig: TxtCustomConfig;
};

export type DetalleEF = {
  envioDocumentos: 'acepta' | 'bypass';
  documentos: DocumentoSeleccionado[];
  modoFirma: 'Controlada';
  integracion: IntegracionConfig;
};

export type DetalleEFP = {
  documentos: DocumentoSeleccionado[];
  modoFirma: 'Controlada';
  integracion: IntegracionConfig;
};

export type Sucursal = {
  nombre: string;
  cajas: number;
};

export type DetallePOS = {
  version: 'LTS' | 'LR' | '2407' | '2407N' | '2503';
  emisor: 'V2503' | 'V2408' | 'EnternetAgenteWSv19' | 'EnternetAgenteWS' | 'ENTEmisorWSL';
  documentos: string[];
  tieneSucursales: boolean;
  sucursales: Sucursal[];
  cajasMatriz: number | null;
  modoFirma: 'ciega' | 'controlada';
  empresaCombustible: boolean;
  membreteLocal: boolean;
  membreteLink: string;
};

export type DispositivoSucursal = {
  sucursal: string;
  dispositivoId: string;
};

export type DetallePOSBox = DetallePOS & {
  tipoPi: 'PI3' | 'PI4';
  dispositivos: DispositivoSucursal[];
  jksEnBox: boolean;
  tieneContingencia: boolean;
  puntosContingencia: string[];
};

export type TerminalBO = {
  nombre: string;
  terminalId: string;
  dispositivoId: string; // Dispositivo ID asociado a la sucursal/contingencia
};

export type TerminalWSLocal = {
  nombreTerminal: string;
  terminalId: string;
  dispositivoId: string; // Dispositivo ID del terminal WS Local / TXT V5
};

export type DetalleBO = {
  documentosAlmacenados: string[];
  terminales: TerminalBO[];
  terminalesWSLocal: TerminalWSLocal[];
  terminalesTxtV5: TerminalWSLocal[];
};

export type DetalleINV = Record<string, never>;

export type DetalleDteProv = {
  casillaIntercambio: string;
};

export type DetalleRecAv = {
  casillaIntercambio: string;
};

export type DetalleGF = Record<string, never>;

export type DetallesServicios = {
  EF?: DetalleEF;
  EFP?: DetalleEFP;
  BO?: DetalleBO;
  POS?: DetallePOS;
  'POS BOX'?: DetallePOSBox;
  'REC AV'?: DetalleRecAv;
  'DTE Prov'?: DetalleDteProv;
  INV?: DetalleINV;
  GF?: DetalleGF;
};

export const DOCUMENTOS_NACIONALES = ['33', '34', '39', '41', '43', '46', '52', '56', '61'];
export const DOCUMENTOS_EXPORTACION = ['110', '111', '112'];
export const DOCUMENTOS_NO_TRIBUTARIOS = ['COM', 'TNT'];