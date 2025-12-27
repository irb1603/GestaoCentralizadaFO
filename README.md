# 🎖️ Sistema de Gestão de Faltas Operacionais (FO)

## Colégio Militar de Brasília

Sistema web completo para gestão centralizada de Fatos Observados (Faltas Operacionais) de alunos do CMB.

---

## 🚀 Links Importantes

### **Sistema Principal**
🔗 [https://gestaocentralizadafo.netlify.app](https://gestaocentralizadafo.netlify.app)

### **Formulário Público de Registro**
🔗 [https://gestaocentralizadafo.netlify.app/public-fo](https://gestaocentralizadafo.netlify.app/public-fo)

### **🎓 Treinamento para Operadores**
📄 **Treinamento_Operadores_Sistema_FO.pptx** (disponível no repositório)

Apresentação PowerPoint completa com:
- 35 slides didáticos
- Conteúdo organizado em 10 seções
- Cores institucionais do CMB
- Material pronto para apresentação

---

## 📋 Sobre o Sistema

### **Funcionalidades Principais**

✅ **Registro de FOs**
- Formulário público para observadores
- Tipos: Positivo, Negativo, Neutro
- Registro individual por aluno

✅ **Fluxo Processual Completo**
- 8 status: Pendente → Encerrado
- Enquadramento automático com RICM
- Controle de sanções disciplinares

✅ **Tipos de Sanções**
- Advertência (falta leve)
- Repreensão (falta média)
- AOE - Atividade de Orientação Educacional (falta grave)
- Retirada (falta gravíssima)

✅ **Geração Automática de Documentos**
- Notas de Aditamento ao BI (DOCX)
- Processos Disciplinares (PDF)
- Termos de Ciência
- Formatação profissional

✅ **Assistente de IA**
- Google Gemini integrado
- Sugestões de enquadramento RICM
- Estatísticas e análises
- Consultas em linguagem natural

✅ **Gestão de Usuários**
- 5 perfis de acesso (Admin, ComandoCA, Comandante, Sargento, Auxiliar)
- Filtros automáticos por companhia
- Auditoria completa de ações

✅ **Recursos Adicionais**
- Dashboard com estatísticas
- Gestão de comportamento
- Controle de faltas escolares
- Integração com GLPI

---

## 🛠️ Tecnologias

- **Frontend:** Vue.js, HTML5, CSS3
- **Build:** Vite
- **Backend:** Firebase Firestore
- **Storage:** Firebase Storage
- **IA:** Google Gemini API
- **Documentos:** Library DOCX, PDFjs
- **Deploy:** Netlify

---

## 👥 Perfis de Usuário

### **Admin**
- Acesso total ao sistema
- Todas as companhias
- Pode deletar FOs
- Acesso à auditoria

### **ComandoCA (Comando da Companhia de Alunos)**
- Visualizar todos os FOs
- Editar status
- Acesso à auditoria
- Não pode deletar

### **Comandante de Companhia**
- Ver FOs da sua companhia
- Editar FOs da sua companhia
- Acesso limitado à auditoria

### **Sargento de Companhia**
- Ver FOs da sua companhia
- Editar FOs da sua companhia
- Sem acesso à auditoria

### **Auxiliar**
- Acesso restrito (Faltas Escolares e Processo Disciplinar)

---

## 📖 Sistema RICM

O sistema implementa completamente o Regulamento Interno dos Colégios Militares:

- **46 Faltas Disciplinares** cadastradas
- **8 Circunstâncias Atenuantes**
- **10 Circunstâncias Agravantes**
- **4 Tipos de Sanções**

---

## 🎓 Treinamento

### **Material Disponível**

📄 **Treinamento_Operadores_Sistema_FO.pptx**

Apresentação PowerPoint completa com 35 slides cobrindo:

1. **Introdução ao Sistema de FO**
2. **Tipos de Usuários e Permissões**
3. **Fluxo Completo das Sanções Disciplinares**
4. **Como Registrar um FO**
5. **Sistema de Enquadramento RICM**
6. **Status e Etapas do Processo** (8 status)
7. **Geração de Documentos Automáticos**
8. **Assistente de IA**
9. **Boas Práticas e Erros Comuns**
10. **Recursos Adicionais e Resumo**

**Duração estimada:** 60-90 minutos

---

## 🚀 Desenvolvimento Local

### **Instalação**

```bash
# Clone o repositório
git clone https://github.com/irb1603/GestaoCentralizadaFO.git

# Entre na pasta
cd GestaoCentralizadaFO

# Instale dependências
npm install

# Execute em desenvolvimento
npm run dev

# Build para produção
npm run build
```

### **Estrutura do Projeto**

```
GestaoCentralizadaFO/
├── src/
│   ├── components/      # Componentes reutilizáveis
│   ├── pages/          # Páginas do sistema
│   ├── services/       # Serviços (IA, email, auditoria)
│   ├── firebase/       # Configuração Firebase
│   ├── utils/          # Utilitários
│   ├── constants/      # Constantes (RICM, status)
│   └── styles/         # Estilos CSS
├── public/             # Arquivos estáticos
├── index.html          # Página principal
├── public-fo.html      # Formulário público
├── treinamento-operadores.html  # Treinamento
└── vite.config.js      # Configuração Vite
```

---

## 🔒 Segurança

- Autenticação via Firebase
- Regras de segurança no Firestore
- Controle de acesso por perfil
- Auditoria completa de ações
- Armazenamento seguro de documentos

---

## 📄 Licença

Sistema desenvolvido exclusivamente para o Colégio Militar de Brasília.
Uso interno apenas.

---

## 📞 Suporte

Para dúvidas sobre o sistema, consulte:
- Administrador do sistema
- Documentação de treinamento
- Assistente de IA integrado

---

## 🎯 Status do Projeto

✅ Sistema em produção
✅ Treinamento em PowerPoint disponível
✅ Material didático completo

---

**Desenvolvido com 🎖️ para o Colégio Militar de Brasília**

*Última atualização: Dezembro 2024*
