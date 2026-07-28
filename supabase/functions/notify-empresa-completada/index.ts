// supabase/functions/notify-empresa-completada/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function minificarHtml(html: string): string {
  return html.replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function plantillaEmpresaCompletada({
  razonSocial, empkey, completadoPorNombre, completadoPorCorreo, fecha, link,
}: {
  razonSocial: string; empkey: string; completadoPorNombre: string;
  completadoPorCorreo: string; fecha: string; link: string;
}) {
  const fila = (label: string, valor: string) =>
    `<tr><td style="padding:10px 0; border-bottom:1px solid #F0ECF8; font-size:12px; font-weight:700; color:#9C93B5; text-transform:uppercase; letter-spacing:0.03em; width:140px;">${label}</td><td style="padding:10px 0; border-bottom:1px solid #F0ECF8; font-size:14px; color:#3B3358;">${valor}</td></tr>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body style="margin:0; padding:0; background-color:#F7F5FB; font-family: Arial, Helvetica, sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F5FB; padding: 32px 16px;"><tr><td align="center"><table role="presentation" width="100%" style="max-width:560px; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow: 0 4px 24px rgba(94,156,122,0.14);"><tr><td style="background: linear-gradient(135deg, #6FAF8E 0%, #5E9C7C 55%, #4C8467 100%); padding: 32px 24px; text-align:center;"><div style="width:52px; height:52px; background-color:rgba(255,255,255,0.18); border-radius:14px; display:inline-block; line-height:52px; font-size:24px; margin-bottom:12px;">&#127970;</div><h1 style="margin:0; color:#ffffff; font-size:21px; font-weight:800;">Empresa completada</h1><p style="margin:6px 0 0; color:rgba(255,255,255,0.88); font-size:13px;">Sistema de Registro &#8212; Runa</p></td></tr><tr><td style="padding: 28px 28px 4px;"><table role="presentation" width="100%" style="border-collapse:collapse;">${fila('Empresa', razonSocial)}${fila('Empkey', empkey)}${fila('Completado por', `${completadoPorNombre} (${completadoPorCorreo})`)}${fila('Fecha', fecha)}</table></td></tr><tr><td style="padding: 24px 28px 32px; text-align:center;"><a href="${link}" style="display:inline-block; background: linear-gradient(135deg, #6FAF8E 0%, #4C8467 100%); color:#ffffff; text-decoration:none; font-size:14px; font-weight:700; padding:12px 30px; border-radius:10px; box-shadow: 0 4px 14px rgba(94,156,122,0.35);">Ver Ficha de la Empresa</a></td></tr><tr><td style="height:5px; background: linear-gradient(90deg, #5E9C7C 0%, #7A6BB0 100%); font-size:0; line-height:0;">&nbsp;</td></tr></table><p style="font-size:11px; color:#9C93B5; margin-top:20px;">Runa</p></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { razonSocial, empkey } = body;

    if (!razonSocial || !empkey) {
      return new Response(JSON.stringify({ error: 'Faltan datos de la empresa' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const { data: miPerfil } = await supabaseClient
      .from('perfiles')
      .select('nombre_completo, correo')
      .eq('id', user.id)
      .single();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: admins } = await supabaseAdmin
      .from('perfiles')
      .select('correo')
      .eq('rol', 'admin');

    const correosAdmins = (admins ?? []).map((a: any) => a.correo).filter(Boolean) as string[];

    if (correosAdmins.length === 0) {
      return new Response(JSON.stringify({ success: true, aviso: 'No hay administradores para notificar' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // La plantilla ya viene minificada (sin saltos de línea) desde la función
    const html = plantillaEmpresaCompletada({
      razonSocial,
      empkey: String(empkey),
      completadoPorNombre: miPerfil?.nombre_completo || 'Sin nombre',
      completadoPorCorreo: miPerfil?.correo || user.email || '',
      fecha: new Date().toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' }),
      link: `${Deno.env.get('APP_URL') ?? 'http://localhost:5173'}/empresas/${empkey}`,
    });

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

    for (const correo of correosAdmins) {
      await client.send({
        from: `Runa <${Deno.env.get('GMAIL_USER')}>`,
        to: correo,
        subject: `Empresa completada: ${razonSocial}`,
        html,
      });
    }

    await client.close();

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