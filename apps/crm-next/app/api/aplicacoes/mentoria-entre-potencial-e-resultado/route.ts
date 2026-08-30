import { NextResponse } from 'next/server';
import {
  normalizeMentorshipApplication,
  validateMentorshipApplication,
} from '../../../../lib/applications/mentorship-application';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';

const APPLICATIONS_TABLE = 'mentoria_entre_potencial_resultado_applications';
const ALLOWED_ORIGINS = new Set([
  'https://ulizarzana.com',
  'https://www.ulizarzana.com',
]);

function corsHeaders(request: Request) {
  const headers = new Headers({
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  });
  const origin = request.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  return headers;
}

function jsonResponse(request: Request, body: unknown, init: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: corsHeaders(request),
  });
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export async function POST(request: Request) {
  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return jsonResponse(request, {
      ok: false,
      message: 'Não foi possível ler as respostas enviadas.',
    }, { status: 400 });
  }

  const validationErrors = validateMentorshipApplication(input);
  if (validationErrors.length > 0) {
    return jsonResponse(request, { ok: false, errors: validationErrors }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from(APPLICATIONS_TABLE)
      .insert(normalizeMentorshipApplication(input));

    if (error) {
      return jsonResponse(request, {
        ok: false,
        message: 'Não foi possível registrar a aplicação agora.',
      }, { status: 500 });
    }
  } catch {
    return jsonResponse(request, {
      ok: false,
      message: 'Não foi possível registrar a aplicação agora.',
    }, { status: 500 });
  }

  return jsonResponse(request, { ok: true }, { status: 201 });
}
