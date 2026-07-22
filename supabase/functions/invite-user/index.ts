// supabase/functions/invite-user/index.ts
//
// Invita a un nuevo usuario del equipo por correo, con diseño propio de Runa.
// Envía el correo vía SMTP de Gmail/Google Workspace.
// Puede ser llamada por admin (cualquier rol) o lider (solo puede invitar agente/vista).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function minificarHtml(html: string): string {
  return html.replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function etiquetaRol(rol: string): string {
  const etiquetas: Record<string, string> = {
    admin: 'Administrador',
    lider: 'Líder de Equipo',
    agente: 'Agente SAC',
    vista: 'Solo Vista',
  };
  return etiquetas[rol] ?? rol;
}

function plantillaInvitacion({ nombre, rolTexto, link }: { nombre: string; rolTexto: string; link: string }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0; padding:0; background-color:#F7F5FB; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F5FB; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow: 0 4px 24px rgba(122,107,176,0.12);">

          <tr>
            <td style="background: linear-gradient(135deg, #8C7EC7 0%, #7A6BB0 45%, #5B4E82 100%); padding: 36px 24px; text-align:center;">
              <div style="width:52px; height:52px; background-color:rgba(255,255,255,0.18); border-radius:14px; display:inline-block; line-height:52px; font-size:22px; font-weight:bold; color:#ffffff; margin-bottom:14px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">R</div>
              <h1 style="margin:0; color:#ffffff; font-size:23px; font-weight:800;">¡Bienvenido a Runa!</h1>
              <p style="margin:8px 0 0; color:rgba(255,255,255,0.88); font-size:13px;">Ficha de clientes</p>
            </td>
          </tr>

          <tr>
            <td style="background: linear-gradient(180deg, #FFFFFF 0%, #FCFBFE 100%); padding: 32px 28px 8px;">
              <p style="font-size:14px; color:#3B3358; line-height:1.6; margin:0 0 16px;">
                Hola${nombre ? ' <strong>' + nombre + '</strong>' : ''},
              </p>
              <p style="font-size:14px; color:#463F63; line-height:1.6; margin:0 0 18px;">
                Se creó tu cuenta en <strong>Runa</strong>, la ficha interna de clientes del equipo SAC.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
                <tr>
                  <td style="background: linear-gradient(135deg, rgba(122,107,176,0.14), rgba(94,156,122,0.14)); border-radius:999px; padding: 6px 16px;">
                    <span style="font-size:12px; font-weight:700; color:#695A9E;">Rol asignado: ${rolTexto}</span>
                  </td>
                </tr>
              </table>
              <p style="font-size:14px; color:#463F63; line-height:1.6; margin:0 0 4px;">
                Para empezar, define tu contraseña haciendo clic en el botón de abajo.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background: linear-gradient(180deg, #FCFBFE 0%, #FFFFFF 100%); padding: 8px 28px 32px; text-align:center;">
              <a href="${link}" style="display:inline-block; background: linear-gradient(135deg, #8C7EC7 0%, #7A6BB0 100%); color:#ffffff; text-decoration:none; font-size:14px; font-weight:700; padding:13px 32px; border-radius:10px; box-shadow: 0 4px 14px rgba(122,107,176,0.35);">
                Crear mi contraseña
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 28px 28px; background-color:#FFFFFF;">
              <p style="font-size:11.5px; color:#9C93B5; line-height:1.5; margin:0;">
                Si no esperabas este correo, puedes ignorarlo con confianza. Este link es personal e intransferible.
              </p>
            </td>
          </tr>

          <tr>
            <td style="height:5px; background: linear-gradient(90deg, #7A6BB0 0%, #5E9C7C 100%); font-size:0; line-height:0;">&nbsp;</td>
          </tr>
        </table>

        <p style="font-size:11px; color:#9C93B5; margin-top:20px;">Runa</p>
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

    const { data: perfilInvitador } = await supabaseClient
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    const rolInvitador = perfilInvitador?.rol;

    // Solo admin y lider pueden invitar
    if (rolInvitador !== 'admin' && rolInvitador !== 'lider') {
      return new Response(JSON.stringify({ error: 'No tienes permisos para invitar usuarios' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, rol, nombre_completo } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'Falta el correo' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determinar el rol final según quién invita
    let rolFinal: string;
    if (rolInvitador === 'admin') {
      // Admin puede asignar cualquier rol válido
      rolFinal = ['admin', 'lider', 'agente', 'vista'].includes(rol) ? rol : 'agente';
    } else {
      // Lider solo puede crear agente o vista — nunca admin ni lider
      rolFinal = ['agente', 'vista'].includes(rol) ? rol : 'agente';
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: linkData, error: errorLink } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${Deno.env.get('APP_URL') ?? 'http://localhost:5173'}/set-password`,
      },
    });

    if (errorLink || !linkData?.properties?.action_link) {
      return new Response(JSON.stringify({ error: errorLink?.message || 'No se pudo generar el link de invitación' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (linkData.user) {
      await supabaseAdmin
        .from('perfiles')
        .update({ rol: rolFinal, nombre_completo: nombre_completo || null })
        .eq('id', linkData.user.id);
    }

    try {
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

      await client.send({
        from: `Runa <${Deno.env.get('GMAIL_USER')}>`,
        to: email,
        subject: 'Te invitaron a Runa',
        html: minificarHtml(plantillaInvitacion({
          nombre: nombre_completo || '',
          rolTexto: etiquetaRol(rolFinal),
          link: linkData.properties.action_link,
        })),
      });

      await client.close();
    } catch (errorCorreo) {
      return new Response(JSON.stringify({ error: 'Cuenta creada, pero falló el envío del correo: ' + String(errorCorreo) }), {
        status: 200,
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