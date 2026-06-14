import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Zap } from 'lucide-react';

const sections = [
  {
    title: '1. Quem Somos',
    content: [
      'O PneuFlow é uma plataforma digital para lojas de pneus criarem vitrines online, organizarem produtos e facilitarem o contato comercial entre lojistas e clientes finais.',
      'Para dados da conta da loja, como nome, e-mail, telefone, dados comerciais e informações de acesso ao painel, o PneuFlow pode atuar como controlador dos dados pessoais.',
      'Para dados de clientes finais tratados em nome da loja, como informações enviadas para orçamento, interesse em produto, veículo ou medida buscada quando informado, a loja é a controladora dos dados e o PneuFlow atua como operador, salvo quando o PneuFlow definir finalidades próprias permitidas pela legislação aplicável.',
    ],
  },
  {
    title: '2. Dados Que Podemos Coletar',
    content: [
      'Dados da loja e do lojista: nome, e-mail, telefone/WhatsApp, nome da loja, endereço comercial, configurações da vitrine e dados necessários para criação e manutenção da conta.',
      'Dados de uso da plataforma: registros técnicos, páginas acessadas, ações no painel, interações com a vitrine, links de indicação e informações necessárias para segurança, suporte e melhoria do serviço.',
      'Dados de clientes finais: nome informado, produto de interesse, veículo ou medida buscada quando informado, origem do contato, horário da interação e informações necessárias para encaminhar o atendimento à loja.',
    ],
  },
  {
    title: '3. Como Usamos Os Dados',
    content: [
      'Usamos os dados para criar e manter contas, exibir vitrines digitais, organizar catálogos, facilitar contatos comerciais, direcionar pedidos de orçamento ao WhatsApp da loja, prestar suporte, proteger a plataforma e melhorar a experiência do usuário.',
      'Pedidos de orçamento pelo WhatsApp são contatos transacionais relacionados ao interesse do cliente em um produto ou serviço da loja.',
      'Ofertas, campanhas e mensagens de marketing pelo WhatsApp dependem de consentimento separado quando exigido pela legislação aplicável. O aceite desta Política de Privacidade não significa aceite automático para marketing.',
    ],
  },
  {
    title: '4. Compartilhamento Com Fornecedores',
    content: [
      'Podemos utilizar fornecedores necessários para hospedar, operar e proteger a plataforma, incluindo Vercel, Supabase e WhatsApp/Meta quando aplicável ao envio ou abertura de conversas comerciais.',
      'Esses fornecedores podem tratar dados conforme suas próprias políticas, contratos e medidas de segurança, sempre dentro do necessário para a prestação do serviço.',
      'Não vendemos dados pessoais.',
    ],
  },
  {
    title: '5. Segurança',
    content: [
      'Adotamos medidas técnicas e organizacionais razoáveis para proteger os dados pessoais contra acessos não autorizados, perda, alteração, uso indevido ou divulgação indevida.',
      'Em caso de incidente de segurança que possa gerar risco ou dano relevante, adotaremos as medidas cabíveis e faremos as comunicações exigidas nos prazos legais e regulatórios aplicáveis.',
    ],
  },
  {
    title: '6. Direitos Dos Titulares',
    content: [
      'Nos termos da LGPD, titulares podem solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informação sobre compartilhamento e revisão de decisões automatizadas, quando aplicável.',
      'Quando o pedido envolver dados de clientes finais tratados em nome da loja, poderemos orientar o titular a contatar a loja controladora ou auxiliar a loja no atendimento da solicitação.',
    ],
  },
  {
    title: '7. Retenção De Dados',
    content: [
      'Mantemos dados pelo tempo necessário para cumprir as finalidades descritas nesta Política, obrigações legais, regulatórias, contratuais, auditorias, prevenção a fraudes e exercício regular de direitos.',
      'Rotinas automáticas de exclusão ou anonimização poderão ser implementadas futuramente, conforme evolução da plataforma e necessidades legais.',
    ],
  },
  {
    title: '8. Encarregado De Dados',
    content: [
      'Encarregado de Dados: [NOME OU ÁREA DE PRIVACIDADE] — dpo@pneuflow.com.br',
      'Esse canal pode ser usado para dúvidas relacionadas à privacidade, proteção de dados e exercício de direitos previstos na LGPD.',
    ],
  },
  {
    title: '9. Alterações Nesta Política',
    content: [
      'Esta Política pode ser atualizada para refletir mudanças no PneuFlow, em fornecedores, na legislação ou em práticas de privacidade.',
      'Quando houver alterações relevantes, poderemos comunicar os usuários por meios razoáveis dentro da própria plataforma ou por outros canais disponíveis.',
    ],
  },
];

export default function PrivacyPolicy() {
  return (
    <main className="privacy-page" style={{
      minHeight: '100vh',
      background:
        'radial-gradient(circle at 16% 8%, rgba(245, 158, 11, 0.14), transparent 28rem), var(--bg-dark)',
      color: 'var(--text-primary)',
      padding: '32px 20px 64px'
    }}>
      <div style={{ width: '100%', maxWidth: '940px', margin: '0 auto' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            fontWeight: 700,
            marginBottom: '28px',
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={16} /> Voltar para o site
        </Link>

        <section className="card" style={{ padding: 'clamp(24px, 5vw, 44px)', overflow: 'hidden' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(245, 158, 11, 0.1)',
            color: 'var(--primary)',
            border: '1px solid rgba(245, 158, 11, 0.24)',
            fontSize: '12px',
            fontWeight: 900,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '18px'
          }}>
            <ShieldCheck size={15} />
            Privacidade e LGPD
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 6vw, 54px)',
            lineHeight: 1,
            margin: '0 0 14px'
          }}>
            Política de Privacidade do PneuFlow
          </h1>
          <p style={{
            color: 'rgba(243, 244, 246, 0.78)',
            fontSize: '16px',
            lineHeight: 1.65,
            maxWidth: '760px',
            margin: '0 0 12px'
          }}>
            Esta Política explica como o PneuFlow trata dados pessoais ao oferecer sua plataforma de vitrine digital, catálogo e atendimento comercial para lojas de pneus.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 32px' }}>
            Última atualização: 14 de junho de 2026.
          </p>

          <div style={{ display: 'grid', gap: '22px' }}>
            {sections.map((section) => (
              <article key={section.title} style={{
                paddingTop: '22px',
                borderTop: '1px solid var(--border)'
              }}>
                <h2 style={{ fontSize: '20px', margin: '0 0 12px' }}>{section.title}</h2>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {section.content.map((paragraph) => (
                    <p key={paragraph} style={{
                      color: 'rgba(243, 244, 246, 0.76)',
                      lineHeight: 1.7,
                      margin: 0,
                      fontSize: '15px'
                    }}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <section id="termos-de-uso" style={{
            marginTop: '34px',
            padding: '22px',
            borderRadius: '20px',
            border: '1px solid rgba(245, 158, 11, 0.22)',
            background: 'rgba(245, 158, 11, 0.07)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Zap size={17} fill="var(--primary)" style={{ color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '20px', margin: 0 }}>Termos de Uso</h2>
            </div>
            <p style={{ color: 'rgba(243, 244, 246, 0.78)', lineHeight: 1.7, margin: 0, fontSize: '15px' }}>
              Ao criar uma conta, a loja declara que usará o PneuFlow de forma lícita, com informações verdadeiras, respeitando clientes finais, regras de privacidade, legislação aplicável e boas práticas no atendimento comercial. Uma versão completa dos Termos de Uso poderá ser publicada em página própria futuramente.
            </p>
          </section>
        </section>
      </div>
    </main>
  );
}
