// supabase/functions/permanently-delete-empresa/index.ts
//
// Elimina PERMANENTEMENTE una empresa (solo si ya está en estado "eliminada").
// Antes de borrar de verdad, arma un respaldo en CSV (empresa + contactos + usuarios + servicios)
// y lo manda por correo a todos los admins. Si el correo falla, NO se borra nada — se protege
// el dato hasta confirmar que el respaldo quedó a salvo.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function minificarHtml(html: string): string {
  return html.replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

// Convierte un arreglo de objetos a texto CSV simple, escapando comas/comillas/saltos de línea
function aCsv(filas: Record<string, unknown>[]): string {
  if (filas.length === 0) return '';
  const columnas = Object.keys(filas[0]);
  const escapar = (valor: unknown) => {
    const texto = valor === null || valor === undefined ? '' : String(valor);
    if (texto.includes(',') || texto.includes('"') || texto.includes('\n')) {
      return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
  };
  const encabezado = columnas.join(',');
  const filasTexto = filas.map((f) => columnas.map((c) => escapar(f[c])).join(','));
  return [encabezado, ...filasTexto].join('\n');
}

function plantillaRespaldoEliminacion({ razonSocial, empkey, eliminadoPor, fecha }: {
  razonSocial: string; empkey: string; eliminadoPor: string; fecha: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0; padding:0; background-color:#F7F5FB; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F5FB; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow: 0 4px 24px rgba(199,123,134,0.16);">
          <tr>
            <td style="background: linear-gradient(135deg, #D08C97 0%, #C77B86 55%, #A85F6A 100%); padding: 32px 24px; text-align:center;">
              <div style="width:52px; height:52px; background-color:rgba(255,255,255,0.18); border-radius:14px; display:inline-block; line-height:52px; font-size:24px; margin-bottom:12px;">🗑️</div>
              <h1 style="margin:0; color:#ffffff; font-size:21px; font-weight:800;">Empresa eliminada permanentemente</h1>
              <p style="margin:6px 0 0; color:rgba(255,255,255,0.88); font-size:13px;">Runa — Respaldo antes de borrar</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 28px 8px;">
              <p style="font-size:14px; color:#3B3358; line-height:1.6; margin:0 0 12px;">
                Se eliminó permanentemente <strong>${razonSocial}</strong> (Empkey ${empkey}) de Runa.
              </p>
              <p style="font-size:13px; color:#463F63; line-height:1.6; margin:0 0 4px;">
                Eliminado por: <strong>${eliminadoPor}</strong><br/>
                Fecha: <strong>${fecha}</strong>
              </p>
              <p style="font-size:13px; color:#463F63; line-height:1.6; margin:16px 0 0;">
                Adjunto va el respaldo completo en CSV (empresa, contactos, usuarios y servicios) por si necesitas
                volver a cargarla más adelante.
              </p>
            </td>
          </tr>
          <tr>
            <td style="height:5px; background: linear-gradient(90deg, #C77B86 0%, #7A6BB0 100%); font-size:0; line-height:0;">&nbsp;</td>
          </tr>
        </table>
        <p style="font-size:11px; color:#9C93B5; margin-top:20px;">Runa — Panel SAC</p>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: miPerfil } = await supabaseClient.from('perfiles').select('rol, nombre_completo, correo').eq('id', user.id).single();
    if (miPerfil?.rol !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo un administrador puede eliminar empresas permanentemente' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { empresaId } = await req.json();
    if (!empresaId) {
      return new Response(JSON.stringify({ error: 'Falta el ID de la empresa' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Traer la empresa y confirmar que esté en estado "eliminada"
    const { data: empresa } = await supabaseAdmin.from('empresas').select('*').eq('id', empresaId).single();
    if (!empresa) {
      return new Response(JSON.stringify({ error: 'No se encontró la empresa' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (empresa.estado_empresa !== 'eliminada') {
      return new Response(JSON.stringify({ error: 'La empresa debe estar en estado "Eliminada" antes de poder borrarla permanentemente' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Traer todos los datos relacionados
    const [{ data: contactos }, { data: usuarios }, { data: servicios }] = await Promise.all([
      supabaseAdmin.from('contactos').select('*').eq('empresa_id', empresaId),
      supabaseAdmin.from('usuarios_activos').select('*').eq('empresa_id', empresaId),
      supabaseAdmin.from('empresa_servicios').select('estado, detalles, servicio:servicio_id(codigo, nombre)').eq('empresa_id', empresaId),
    ]);

    // 3. Armar los 4 CSV de respaldo
    const csvEmpresa = aCsv([{
      empkey: empresa.empkey, rut: empresa.rut, razon_social: empresa.razon_social,
      nombre_fantasia: empresa.nombre_fantasia ?? '',
    }]);
    const csvContactos = aCsv((contactos ?? []).map((c: any) => ({
      empkey: empresa.empkey, tipo: c.tipo, nombre: c.nombre, apellido: c.apellido,
      correo: c.correo ?? '', telefono: c.telefono ?? '',
    })));
    const csvUsuarios = aCsv((usuarios ?? []).map((u: any) => ({
      empkey: empresa.empkey, rut: u.rut, nombre: u.nombre, estado: u.estado,
    })));
    const csvServicios = aCsv((servicios ?? []).map((s: any) => ({
      empkey: empresa.empkey, codigo_servicio: s.servicio?.codigo ?? '', nombre_servicio: s.servicio?.nombre ?? '',
      estado: s.estado, detalles_json: JSON.stringify(s.detalles ?? {}),
    })));

    // 4. Buscar admins a notificar
    const { data: admins } = await supabaseAdmin.from('perfiles').select('correo').eq('rol', 'admin');
    const correosAdmins = (admins ?? []).map((a) => a.correo).filter(Boolean) as string[];

    if (correosAdmins.length === 0) {
      return new Response(JSON.stringify({ error: 'No hay administradores con correo registrado — se canceló el borrado por seguridad' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Enviar el respaldo por correo — SOLO si esto funciona seguimos con el borrado real
    try {
      const html = minificarHtml(plantillaRespaldoEliminacion({
        razonSocial: empresa.razon_social,
        empkey: String(empresa.empkey),
        eliminadoPor: `${miPerfil?.nombre_completo || 'Sin nombre'} (${miPerfil?.correo || user.email})`,
        fecha: new Date().toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' }),
      }));

      const client = new SMTPClient({
        content_encoding: 'base64',
        connection: {
          hostname: 'smtp.gmail.com',
          port: 465,
          tls: true,
          auth: {
            username: Deno.env.get('GMAIL_USER') ?? '',
            password: Deno.env.get('GMAIL_APP_PASSWORD') ?? '',
          },
        },
      });

      const attachments = [
        { encoding: 'text', content: csvEmpresa, contentType: 'text/csv', filename: `empresa_${empresa.empkey}.csv` },
        { encoding: 'text', content: csvContactos || 'sin_datos', contentType: 'text/csv', filename: `contactos_${empresa.empkey}.csv` },
        { encoding: 'text', content: csvUsuarios || 'sin_datos', contentType: 'text/csv', filename: `usuarios_${empresa.empkey}.csv` },
        { encoding: 'text', content: csvServicios || 'sin_datos', contentType: 'text/csv', filename: `servicios_${empresa.empkey}.csv` },
      ];

      for (const correo of correosAdmins) {
        await client.send({
          from: `Runa <${Deno.env.get('GMAIL_USER')}>`,
          to: correo,
          subject: `[Respaldo] Empresa eliminada permanentemente: ${empresa.razon_social}`,
          html,
          attachments,
        });
      }

      await client.close();
    } catch (errorCorreo) {
      // No se pudo mandar el respaldo — se cancela el borrado para no perder el dato sin resguardo
      return new Response(JSON.stringify({ error: 'No se pudo enviar el respaldo por correo, se canceló el borrado: ' + String(errorCorreo) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Recién ahora, con el respaldo ya enviado, se borra de verdad (cascade limpia lo relacionado)
    const { error: errorDelete } = await supabaseAdmin.from('empresas').delete().eq('id', empresaId);
    if (errorDelete) {
      return new Response(JSON.stringify({ error: 'El respaldo se envió, pero falló el borrado: ' + errorDelete.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});