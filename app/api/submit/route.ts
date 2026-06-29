import { supabase } from "@/lib/supabase";
import { calculateArchetype, type Archetype } from "@/lib/quizzes";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, archetype_id, answers } = body as {
      email?: string;
      archetype_id?: string;
      answers?: Record<string, string>;
    };

    let archetype: Archetype | null = null;
    if (answers) {
      archetype = calculateArchetype(answers);
    }

    const finalArchetypeId = archetype_id ?? archetype?.id ?? "unknown";

    const sessionId = crypto.randomUUID();

    if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        await supabase.from("quiz_leads").upsert({
          email: email ?? null,
          archetype_id: finalArchetypeId,
          answers: answers ?? {},
          created_at: new Date().toISOString(),
        });
      } catch {
        // Supabase failure is non-blocking
      }
    }

    return Response.json({
      ok: true,
      archetype_id: finalArchetypeId,
      session_id: sessionId,
    });
  } catch {
    // Never block the user — always return 200
    const sessionId = crypto.randomUUID();
    return Response.json({
      ok: true,
      archetype_id: "unknown",
      session_id: sessionId,
    });
  }
}
