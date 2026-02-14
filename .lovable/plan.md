

## Corrigir overflow e melhorar UX do dialog de usuarios por provedor

### Problemas identificados

1. **Sem rolagem no dialog (provedor W2A):** O provedor W2A tem 20 usuarios vinculados. A tabela cresce sem limite, ultrapassando a tela.
2. **UX confusa para adicionar usuarios:** O select + botao de adicionar existem, mas podem nao ser claros o suficiente. Quando todos os usuarios ja estao vinculados, o select mostra "Nenhum usuario disponivel" e o botao fica desabilitado, o que pode parecer que nao existe funcionalidade de adicionar.

### Alteracoes

**1. Adicionar rolagem ao dialog (`GerenciarUsuariosProvedorDialog.tsx`)**
- Aplicar `max-h-[90vh]` e `overflow-y-auto` no `DialogContent`
- Envolver a tabela de usuarios vinculados em um `ScrollArea` com `max-h-[400px]` para que a lista role independentemente
- Manter o select de adicionar usuario sempre visivel no topo, fora da area de rolagem

**2. Melhorar clareza visual do controle de adicionar**
- Adicionar um label "Adicionar usuario" acima do select
- Trocar o botao de icone por um botao com texto "Adicionar" para ficar mais obvio

### Detalhes tecnicos

- Importar `ScrollArea` de `@/components/ui/scroll-area`
- Aplicar `max-h-[90vh] overflow-y-auto` no `DialogContent`
- Envolver o bloco `<Table>` em `<ScrollArea className="max-h-[400px]">`
- Adicionar `<DialogDescription>` para resolver o warning de acessibilidade nos console logs
- Substituir `<Button size="icon">` por `<Button>` com texto "Adicionar"
