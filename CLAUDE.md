# Projeto: Minhas Leituras

## Visão Geral
"Minhas Leituras" é um aplicativo web full-stack para gerenciamento e leitura otimizada de PDFs. O foco é extrair o texto bruto de arquivos PDF (removendo formatações e quebras de linha indesejadas) e renderizá-lo em uma interface limpa. O usuário tem controle total sobre a tipografia (tamanho, alinhamento) e o tema (claro, escuro, sépia). O app também atua como um diário de leitura, permitindo salvar resenhas e anotações.

## Stack Tecnológico
- **Framework:** Next.js (App Router recomendado).
- **Linguagem:** TypeScript.
- **Estilização:** Tailwind CSS.
- **Backend as a Service (BaaS):** Supabase (PostgreSQL para dados, Storage para os PDFs/Capas, Auth para usuários).
- **Ícones:** Lucide React.

## Arquitetura e Objetivos
1. **Banco de Dados (Supabase):** Estruturar tabelas para `users`, `books` (metadados, url do arquivo, url da capa, estado da leitura) e `reviews`.
2. **Storage (Supabase):** Armazenamento em nuvem seguro para os arquivos `.pdf` de upload e imagens de capa.
3. **Processamento de PDF:** Integrar uma solução para extração de texto (ex: `pdf.js` rodando no client-side ou uma API Route no Next.js processando com `pdf-parse`) para separar o conteúdo e limpar hifenizações quebradas.
4. **Leitor Customizável:** Componente de leitura que consome o texto limpo e aplica classes Tailwind dinâmicas baseadas nas preferências do usuário (salvas no banco de dados).

## Diretrizes de Código
- **TypeScript:** Usar interfaces e tipagem estrita para todos os componentes, props e retornos de chamadas do Supabase.
- **Next.js:** Separar claramente Server Components (para listagem da galeria inicial) e Client Components (para o visualizador do PDF e interações de UI usando `'use client'`).
- **Estilização:** Utilizar exclusivamente Tailwind CSS.
- **Idioma da UI:** Português do Brasil (pt-BR).