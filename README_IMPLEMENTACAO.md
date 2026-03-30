# O que já deixei pronto no código

## Fase 2
- Modal de status/tracking (`StatusModal.jsx`)
- Upload PDF NF Débito no status emitida
- Envio de email via Brevo (`EmailModal.jsx`)
- Seleção em lote com barra de ações
- Geração de Notificação de Débito (`notification.js`)
- Export Excel por aba e completo
- Aba NFs Débito
- Aba Por Transportador
- Aba Aging completa
- Editar transportador da nota
- Portal separado em componentes e views
- Aceite formal do transportador com captura IP + user-agent

## Fase 3
- Hook de permissões (`usePermissions.jsx`) com fallback se a tabela ainda não existir
- Hook de metadados por nota (`useNoteMeta.jsx`)
- Hook de auditoria (`useAudit.jsx`)
- Aba de Auditoria
- Dashboard avançado com gráficos (`DashboardAdvanced.jsx`)
- Hook de notificações (`useNotifications.jsx`)
- SQL de criação das tabelas (`supabase/migrations/20260329_phase2_3.sql`)
- Edge Functions de exemplo:
  - `supabase/functions/check-rules/index.ts`
  - `supabase/functions/send-notification/index.ts`

# O que ainda depende de você

## 1. Rodar o SQL no Supabase
Abra o SQL Editor do Supabase e rode:
- `supabase/migrations/20260329_phase2_3.sql`

Sem isso, as partes de RBAC, auditoria, notificações e metadados da nota funcionam em modo de compatibilidade/fallback.

## 2. Confirmar bucket de storage
O upload do PDF usa o bucket público `attachments`.
Se ele não existir no seu Supabase, crie esse bucket.

## 3. Variáveis do Netlify para email
No Netlify, confirmar:
- `BREVO_API_KEY`
- `FROM_EMAIL`
- `FROM_NAME`

## 4. Deploy das Edge Functions (opcional, Fase 3)
Se quiser automação diária e notificação por função server-side, publicar:
- `check-rules`
- `send-notification`

## 5. Ajustar perfis dos usuários
Se quiser perfis diferentes de `internal` e `transportador`, atualizar o `role` no metadata dos usuários do Supabase.

# Como publicar
## Rodar local
```bash
npm install
npm run dev
```

## Gerar build
```bash
npm run build
```

## Para subir no Netlify manualmente
publique a pasta `dist` junto com:
- `netlify.toml`
- `netlify/functions`

## Observação importante
O código já compila. O restante agora é principalmente configuração de banco, bucket, variáveis e deploy.


## Ajuste funcional do processo (sem mexer nas regras de entrada)
- **Mantido intacto** o critério que separa o que cai em `Pendente Cobrança` e `Pendente Lançamento`.
- Reorganizado o fluxo operacional da nota com:
  - pendência atual
  - visibilidade do transportador
  - posição do transportador
  - próxima ação sugerida
  - fechamento correto por fila
- Atualizadas as nomenclaturas dos status para refletirem melhor o processo real, sem trocar os códigos já usados na base.
- Melhorada a tela da nota para evidenciar o fluxo e o dono da ação.
- Status/Tracking agora preenchem automaticamente parte dos metadados operacionais da nota (`responsavel`, `proxima_acao`, `cobrar_transportador`, `retorno_autorizado`, `aguardando_documento`).
- Adicionado tutorial específico: `TUTORIAL_FLUXO_FUNCIONAL.md`.
