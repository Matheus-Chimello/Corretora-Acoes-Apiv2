import React from 'react';

const indicators = [
    { symbol: 'IBOV', value: '169.345,81', change: '0,90%', direction: 'up' },
    { symbol: 'PETR4', value: '44,37', change: '2,73%', direction: 'up' },
    { symbol: 'VALE3', value: '73,57', change: '1,95%', direction: 'up' },
    { symbol: 'ITUB4', value: '38,12', change: '-0,60%', direction: 'down' },
    { symbol: 'WEGE3', value: '48,48', change: '0,06%', direction: 'up' },
    { symbol: 'BBDC4', value: '14,82', change: '-0,34%', direction: 'down' },
    { symbol: 'ABEV3', value: '14,76', change: '0,14%', direction: 'up' }
];

const IndicatorSet = ({ hidden = false }) => (
    <div className="market-ticker__set" aria-hidden={hidden || undefined}>
        {indicators.map((indicator) => (
            <div className="market-ticker__item" key={indicator.symbol}>
                <span className="market-ticker__symbol">{indicator.symbol}</span>
                <span className="market-ticker__value">R$ {indicator.value}</span>
                <span className={`market-ticker__change ${indicator.direction}`}>{indicator.change}</span>
            </div>
        ))}
    </div>
);

const MarketTicker = () => (
    <section className="market-ticker" aria-label="Indicadores de mercado de referência">
        <div className="market-ticker__label">Mercado</div>
        <div className="market-ticker__viewport">
            <div className="market-ticker__track">
                <IndicatorSet />
                <IndicatorSet hidden />
            </div>
        </div>
    </section>
);

export default MarketTicker;
