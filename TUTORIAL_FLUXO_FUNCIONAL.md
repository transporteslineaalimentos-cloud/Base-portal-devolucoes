# Tutorial — Fluxo funcional do portal (sem mexer na regra de entrada)

## O que foi mantido intacto
**Não foi alterado**:
- a regra que decide o que cai em `Pendente Cobrança`
- a regra que decide o que cai em `Pendente Lançamento`
- a classificação original que já vem da planilha/base

Ou seja: a **porta de entrada** de cada fila continua igual.

## O que foi implementado em cima disso
Foi organizado o processo de trabalho de cada nota com:
- status internos mais claros
- posição do transportador separada da análise interna
- pendência atual (`interno`, `transportador`, `controladoria`, `encerrado`)
- visibilidade do transportador baseada no estágio da nota
- próxima ação sugerida dentro da nota
- comportamento de conversão de lançamento para cobrança preservando a fila de entrada
- painel de gestão com prioridade, responsável, próxima ação, flags e SLA

## Fluxo da aba Pendente Cobrança
### Status internos / processo
- `pendente` → Pendente análise
- `validado` → Validada internamente
- `cobr_tr` → Aguardando posição do transportador
- `tr_contestou` → Transportador contestou
- `tr_concordou` → Transportador aprovou
- `tr_nao_resp` → Transportador não responsável
- `aprovar_ret` → Analisar retorno do transportador
- `emitida` → NF débito emitida
- `cobrada` → Cobrada
- `paga` → Paga
- `cancelada` → Cancelada

### Regra de visibilidade do transportador
Na cobrança, o transportador passa a ver a nota quando o status chegar a:
- `cobr_tr`
- `tr_contestou`
- `tr_concordou`
- `tr_nao_resp`
- `emitida`
- `cobrada`
- `paga`

### O que o transportador pode fazer
Na cobrança, o transportador só responde enquanto a nota está aguardando posição dele. Hoje a ação liberada para ele é no status:
- `cobr_tr`

As respostas possíveis são:
- aprovar (`tr_concordou`)
- contestar (`tr_contestou`)
- não responsável (`tr_nao_resp`)

## Fluxo da aba Pendente Lançamento
### Status do processo
- `aguardando` → Pendente análise
- `notificado` → Em análise interna
- `retorno_auto` → Retorno autorizado
- `em_transito` → Em retorno para o CD
- `agendado` → Recebimento agendado
- `perdeu_agenda` → Perdeu agenda
- `dev_recusada` → Transportador recusou retorno
- `dev_apos_dt` → Devolução após entrega
- `extravio` → Extravio informado
- `entregue` → Entregue no CD
- `ret_nao_auto` → Retorno não autorizado
- `encaminhar` → Converter para cobrança

### Regra de visibilidade do transportador
Na fila de lançamento, o transportador passa a ver a nota quando o retorno está em estágio operacional. A visibilidade foi configurada para:
- `retorno_auto`
- `em_transito`
- `agendado`
- `perdeu_agenda`
- `dev_recusada`
- `dev_apos_dt`
- `extravio`
- `entregue`

### O que o transportador pode fazer
Na fila de lançamento, o transportador pode atualizar posição quando a nota estiver em:
- `retorno_auto`
- `em_transito`
- `agendado`
- `perdeu_agenda`
- `extravio`

As ações operacionais dele permanecem relacionadas a:
- em retorno
- agendamento
- entrega
- extravio

## O que o portal passou a mostrar na nota
Dentro de cada nota agora aparecem:
- fila (`Pendente Cobrança` ou `Pendente Lançamento`)
- pendência atual
- posição do transportador
- indicação se a nota já está visível para o transportador
- próxima ação sugerida
- regra de encerramento da nota

E dentro da aba **Gestão** aparecem:
- prioridade
- responsável
- próxima ação manual
- motivo de bloqueio
- flag de cobrar transportador
- flag de retorno autorizado
- flag de aguardando documento
- barra de SLA

## O que ainda precisa de você
### 1. Testar o fluxo no portal
Você precisa validar em ambiente real se os nomes e a lógica fazem sentido para a operação.

### 2. Publicar o build novo no Netlify
Use o build novo gerado desta versão.

### 3. Garantir que a function `admin-users` esteja publicada
Se a aba **Usuários** for usada, a Edge Function `admin-users` precisa estar publicada no Supabase.

### 4. Garantir que exista um usuário com role `admin`
Sem isso, a aba **Usuários** não aparece.

## Checklist rápido para homologação
### Cobrança
- uma nota entrou em cobrança sem quebrar a regra original
- interno conseguiu validar
- transportador viu a nota no momento certo
- transportador conseguiu aprovar/contestar/não responsável
- interno conseguiu emitir NF débito
- interno conseguiu marcar cobrada/paga

### Lançamento
- uma nota entrou em lançamento sem quebrar a regra original
- interno conseguiu autorizar retorno
- transportador só viu depois da autorização
- transportador conseguiu informar andamento
- interno conseguiu encerrar por entrega
- interno conseguiu converter para cobrança quando necessário

### Gestão
- chat funcionando
- anexos funcionando
- painel de gestão salvando
- histórico/auditoria registrando mudanças
- export Excel funcionando
