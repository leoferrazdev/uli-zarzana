import { NextResponse } from 'next/server';
import {
  normalizeMentorshipApplication,
  validateMentorshipApplication,
} from '../../../../lib/applications/mentorship-application';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';

const APPLICATIONS_TABLE = 'mentoria_entre_potencial_resultado_applications';

export async function POST(request: Request) {
  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Não foi possível ler as respostas enviadas.' },
      { status: 400 },
    );
  }

  const validationErrors = validateMentorshipApplication(input);
  if (validationErrors.length > 0) {
    return NextResponse.json(
      { ok: false, errors: validationErrors },
      { status: 400 },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from(APPLICATIONS_TABLE)
      .insert(normalizeMentorshipApplication(input));

    if (error) {
      return NextResponse.json(
        { ok: false, message: 'Não foi possível registrar a aplicação agora.' },
        { status: 500 },
      );
    }
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Não foi possível registrar a aplicação agora.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
