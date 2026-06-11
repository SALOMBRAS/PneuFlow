import './FeedbackCarousel.css';

const reviews = [
  {
    name: 'Lucas Salomão',
    username: '@salomao',
    body: 'Depois que comecei a usar a vitrine virtual, meus clientes conseguem ver os produtos com muito mais facilidade. Ficou bem mais prático vender.',
    img: '/feedbacks/salomao.webp',
  },
  {
    name: 'Joel Coutinho',
    username: '@Jcoutinho',
    body: 'A vitrine deixou minha loja mais profissional. Agora consigo mostrar meus produtos de forma rápida e organizada.',
    img: '/feedbacks/Jcoutinho.webp',
  },
  {
    name: 'Brian Werter',
    username: '@BrianW',
    body: 'Percebi aumento nos pedidos pelo WhatsApp depois que coloquei a vitrine no ar. Facilitou muito o atendimento.',
    img: '/feedbacks/BrianW.webp',
  },
  {
    name: 'Jackson Camilo',
    username: '@Camilo',
    body: 'O sistema é simples, bonito e direto. Meus clientes acessam, escolhem o produto e já chamam no WhatsApp.',
    img: '/feedbacks/Camilo.webp',
  },
  {
    name: 'Jackson Castro',
    username: '@jCastro',
    body: 'Antes eu perdia muito tempo mandando foto por foto. Com a vitrine, o cliente já vê tudo sozinho.',
    img: '/feedbacks/jCastro.webp',
  },
  {
    name: 'Rico Pneus',
    username: '@RicoPneus',
    body: 'Minha loja ficou com aparência mais moderna. A vitrine passou mais confiança para os clientes.',
    img: '/feedbacks/RicoPneus.webp',
  },
  {
    name: 'Jack Motos',
    username: '@Jack.motos25',
    body: 'A praticidade foi o que mais gostei. Cadastrei os produtos e já comecei a receber mais contatos.',
    img: '/feedbacks/Jack.motos25.webp',
  },
  {
    name: 'Igor Rocha',
    username: '@Igorcrocha',
    body: 'A vitrine ajudou bastante nas vendas, principalmente porque o cliente consegue ver as opções antes de falar comigo.',
    img: '/feedbacks/Igorcrocha.webp',
  },
];

const firstRow = reviews.slice(0, reviews.length / 2);
const secondRow = reviews.slice(reviews.length / 2);

function ReviewCard({ img, name, username, body, isDuplicate = false }) {
  return (
    <figure className="feedback-marquee-card" aria-hidden={isDuplicate ? 'true' : undefined}>
      <div className="feedback-marquee-card__header">
        <img
          className="feedback-marquee-card__avatar"
          width="40"
          height="40"
          alt={name}
          src={img}
          loading="lazy"
          decoding="async"
        />
        <div className="feedback-marquee-card__identity">
          <figcaption className="feedback-marquee-card__name">{name}</figcaption>
          <p className="feedback-marquee-card__username">{username}</p>
        </div>
      </div>
      <blockquote className="feedback-marquee-card__text">{body}</blockquote>
    </figure>
  );
}

function MarqueeRow({ items, reverse = false }) {
  const repeatedItems = [...items, ...items];

  return (
    <div className={`feedback-marquee-row${reverse ? ' feedback-marquee-row--reverse' : ''}`}>
      <div className="feedback-marquee-track">
        {repeatedItems.map((review, index) => (
          <ReviewCard
            key={`${review.username}-${index}`}
            {...review}
            isDuplicate={index >= items.length}
          />
        ))}
      </div>
    </div>
  );
}

const FeedbackCarousel = () => {
  return (
    <section className="feedback-carousel-section" aria-labelledby="feedback-carousel-title">
      <div className="container">
        <div className="feedback-marquee-header">
          <span className="feedback-marquee-eyebrow">Prova social</span>
          <h2 id="feedback-carousel-title" className="carousel-title">
            Lojas que já confiam no PneuFlow
          </h2>
          <p className="feedback-marquee-subtitle">
            Depoimentos reais de lojas que organizaram a vitrine e aceleraram o atendimento pelo WhatsApp.
          </p>
        </div>

        <div className="feedback-marquee-shell">
          <MarqueeRow items={firstRow} />
          <MarqueeRow items={secondRow} reverse />
        </div>
      </div>
    </section>
  );
};

export default FeedbackCarousel;
