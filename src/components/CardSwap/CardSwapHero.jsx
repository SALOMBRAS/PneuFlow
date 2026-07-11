import CardSwap, { Card } from './CardSwap';

const cards = [
  { title: 'Dashboard', image: '/card-swap/dashboard.webp' },
  { title: 'Anúncios', image: '/card-swap/anuncios.webp' },
  { title: 'Vitrine', image: '/card-swap/vitrine.webp' }
];

export default function CardSwapHero() {
  return (
    <div className="card-swap-hero-frame">
      <CardSwap
        width={500}
        height={360}
        cardDistance={64}
        verticalDistance={74}
        delay={5000}
        pauseOnHover={false}
        skewAmount={4}
        easing="elastic"
      >
        {cards.map((card, index) => (
          <Card key={card.title}>
            <div className="card-swap-panel">
              <header className="card-swap-panel__header">
                <span>{card.title}</span>
                <span className="card-swap-panel__dot" aria-hidden="true" />
              </header>
              <div className="card-swap-panel__body">
                <div className="card-swap-panel__frame">
                  <img
                    src={card.image}
                    alt={`Prévia da área ${card.title} do PneuFlow`}
                    width="960"
                    height="540"
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchPriority={index === 0 ? 'high' : 'auto'}
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </CardSwap>
    </div>
  );
}
