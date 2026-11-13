import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Remitente {
  nombre?: string;
  correo?: string;
  rol?: string;
}

interface AdjuntoInput {
  nombre?: string;
  base64?: string;
  tipo?: string;
}

interface BodySolicitud {
  titulo?: string;
  tipo?: string;
  descripcion?: string;
  adjuntos?: AdjuntoInput[];
  remitente?: Remitente;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  // Leer body PRIMERO, antes de cualquier otra operación async
  let body: BodySolicitud;
  try {
    body = (await req.json()) as BodySolicitud;
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const { titulo, tipo, descripcion, adjuntos, remitente } = body ?? {};

  if (!titulo || !descripcion) {
    return new Response(JSON.stringify({ error: 'Faltan campos obligatorios' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const GMAIL_USER = Deno.env.get('GMAIL_USER')!;
  const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD')!;
  const DESTINATARIO = 'camila.palma@enternet.cl';

  const etiquetaTipo = tipo === 'mejora' ? '🛠️ Mejora / Sugerencia' : '📋 Consulta / Solicitud';
  const fechaFormateada = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });

  // Construir HTML del correo
  const adjuntosHtml = Array.isArray(adjuntos) && adjuntos.length > 0
    ? `<tr><td class="lbl">Adjuntos</td><td class="val">${adjuntos.length} imagen${adjuntos.length > 1 ? 'es' : ''} (ver al pie del correo)</td></tr>`
    : '';
  const htmlContent = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;background:#f5f4fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a2e}.wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(122,107,176,0.13)}.hdr{background:linear-gradient(135deg,#7A6BB0 0%,#9B8EC4 100%);padding:28px 32px;color:#fff}.hdr h1{margin:0 0 4px;font-size:20px;font-weight:700;letter-spacing:-0.3px}.hdr p{margin:0;font-size:13px;opacity:.85}.badge{display:inline-block;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);border-radius:20px;padding:3px 12px;font-size:12px;font-weight:600;margin-top:10px}.card{margin:24px 28px;border:1px solid #EAE5F5;border-radius:10px;overflow:hidden}.card table{width:100%;border-collapse:collapse}.lbl{font-size:12px;font-weight:600;color:#9C93B5;padding:11px 16px;background:#FAF8FD;white-space:nowrap;width:110px;border-bottom:1px solid #EAE5F5}.val{font-size:13.5px;color:#2d2d4e;padding:11px 16px;border-bottom:1px solid #EAE5F5}.card table tr:last-child .lbl,.card table tr:last-child .val{border-bottom:none}.desc-wrap{margin:0 28px 24px}.desc-lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9C93B5;margin-bottom:8px}.desc-box{background:#FAF8FD;border:1px solid #EAE5F5;border-radius:8px;padding:14px 16px;font-size:13.5px;color:#2d2d4e;line-height:1.65;white-space:pre-wrap}.ftr{background:#FAF8FD;padding:14px 28px;border-top:1px solid #EAE5F5;font-size:11.5px;color:#B0A8CC;text-align:center}</style></head><body><div class="wrap"><div class="hdr"><h1>Nueva solicitud en Runa</h1><p>${titulo}</p><span class="badge">${etiquetaTipo}</span></div><div class="card"><table><tr><td class="lbl">Nombre</td><td class="val"><strong>${remitente?.nombre ?? '—'}</strong></td></tr><tr><td class="lbl">Correo</td><td class="val">${remitente?.correo ?? '—'}</td></tr><tr><td class="lbl">Rol</td><td class="val">${remitente?.rol ?? '—'}</td></tr>${adjuntosHtml}</table></div><div class="desc-wrap"><div class="desc-lbl">Descripción</div><div class="desc-box">${descripcion.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></div><div class="ftr">Enviado el ${fechaFormateada} &middot; Desde Runa</div></div></body></html>`.trim();

  // Construir adjuntos para denomailer
  // denomailer espera content como Uint8Array (decoded desde base64)
  const emailAttachments: { filename: string; contentType: string; encoding: 'binary'; content: Uint8Array }[] = [];
  if (Array.isArray(adjuntos)) {
    for (const adj of adjuntos) {
      if (adj?.base64 && adj?.nombre && adj?.tipo) {
        // Decodificar base64 → Uint8Array
        const binaryStr = atob(adj.base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        emailAttachments.push({
          filename: adj.nombre,
          contentType: adj.tipo,
          encoding: 'binary',
          content: bytes,
        });
      }
    }
  }

  try {
    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
      },
    });

    await client.send({
      from: GMAIL_USER,
      to: DESTINATARIO,
      replyTo: remitente?.correo ?? GMAIL_USER,
      subject: `[Runa] ${etiquetaTipo}: ${titulo}`,
      html: htmlContent,
      attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
    });

    await client.close();

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error enviando solicitud:', JSON.stringify({ message: msg, stack: err instanceof Error ? err.stack : null, raw: String(err) }));
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});