import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: portalData } = await supabase.from('portal_data').select('data').eq('id', 1).single()
  const allNotes = [...(portalData?.data?.cobr || []), ...(portalData?.data?.pend || [])]
  for (const note of allNotes) {
    const dt = note?.dt?.split('/')
    if (!dt || dt.length !== 3) continue
    const opened = new Date(dt[2], Number(dt[1]) - 1, Number(dt[0]))
    const aging = Math.floor((Date.now() - opened.getTime()) / 86400000)
    if (aging > 15) {
      await supabase.from('portal_note_meta').upsert({
        nf_key: `${note.nfd || ''}|${note.nfo || ''}`,
        prioridade: 'alta',
        updated_at: new Date().toISOString(),
      })
    }
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } })
})
