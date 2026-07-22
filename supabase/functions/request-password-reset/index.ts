// supabase/functions/request-password-reset/index.ts
//
// Envía el correo de "olvidé mi contraseña" con diseño propio de Runa.
// No requiere estar logueado. Siempre responde con éxito por seguridad.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function minificarHtml(html: string): string {
  return html.replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function plantillaRecuperacion({ link }: { link: string }) {
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
              <h1 style="margin:0; color:#ffffff; font-size:23px; font-weight:800;">Restablece tu contraseña</h1>
              <p style="margin:8px 0 0; color:rgba(255,255,255,0.88); font-size:13px;">Ficha de clientes</p>
            </td>
          </tr>

          <tr>
            <td style="background: linear-gradient(180deg, #FFFFFF 0%, #FCFBFE 100%); padding: 32px 28px 8px;">
              <p style="font-size:14px; color:#3B3358; line-height:1.6; margin:0 0 16px;">
                Recibimos una solicitud para restablecer tu contraseña en <strong>Runa</strong>.
              </p>
              <p style="font-size:14px; color:#463F63; line-height:1.6; margin:0 0 4px;">
                Haz clic en el botón de abajo para crear una nueva. Este link expira en 1 hora.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background: linear-gradient(180deg, #FCFBFE 0%, #FFFFFF 100%); padding: 20px 28px 32px; text-align:center;">
              <a href="${link}" style="display:inline-block; background: linear-gradient(135deg, #8C7EC7 0%, #7A6BB0 100%); color:#ffffff; text-decoration:none; font-size:14px; font-weight:700; padding:13px 32px; border-radius:10px; box-shadow: 0 4px 14px rgba(122,107,176,0.35);">
                Restablecer contraseña
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 28px 28px; background-color:#FFFFFF;">
              <p style="font-size:11.5px; color:#9C93B5; line-height:1.5; margin:0;">
                Si no pediste esto, puedes ignorar este correo con confianza — tu contraseña actual sigue funcionando igual.
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

  const respuestaGenerica = new Response(
    JSON.stringify({ success: true, message: 'Si el correo existe en Runa, te llegará un link para restablecer tu contraseña.' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );

  try {
    const { email } = await req.json();
    if (!email) return respuestaGenerica;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: linkData, error: errorLink } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${Deno.env.get('APP_URL') ?? 'http://localhost:5173'}/set-password`,
      },
    });

    if (errorLink || !linkData?.properties?.action_link) {
      return respuestaGenerica;
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
        subject: 'Restablece tu contraseña — Runa',
        html: minificarHtml(plantillaRecuperacion({ link: linkData.properties.action_link })),
      });

      await client.close();
    } catch {
      // Si falla el envío, respondemos genérico igual
    }

    return respuestaGenerica;
  } catch {
    return respuestaGenerica;
  }
});