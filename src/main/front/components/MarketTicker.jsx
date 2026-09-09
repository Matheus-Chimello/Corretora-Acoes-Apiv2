import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { isAuthenticated } from '../services/auth';
import { MARKET_TICKER_UPDATED_EVENT } from '../services/marketTicker';

const FALLBACK_INDICATORS = [
    { symbol: 'IBOV', value: '---', currency: 'BRL', updatedAt: null },
    { symbol: 'PETR4', value: '---', currency: 'BRL', updatedAt: null },
    { symbol: 'VALE3', value: '---', currency: 'BRL', updatedAt: null },
    { symbol: 'ITUB4', value: '---', currency: 'BRL', updatedAt: null }
];

const formatQuote = (value, currency) => {
    if (value === '---' || value === null || value === undefined) return '---';
    return Number(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: currency === 'USD' ? 'USD' : 'BRL'
    });
};

const formatUpdateTime = (value) => {
    if (!value) return 'Aguardando atualização';
    return `Atualizado ${new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

const IndicatorSet = ({ indicators, hidden = false }) => (
    <div className="market-ticker__set" aria-hidden={hidden || undefined}>
        {indicators.map((indicator) => (
            <div className="market-ticker__item" key={indicator.symbol}>
                <span className="market-ticker__symbol">{indicator.symbol}</span>
                <span className="market-ticker__value">{formatQuote(indicator.value, indicator.currency)}</span>
                <span className="market-ticker__change neutral">{formatUpdateTime(indicator.updatedAt)}</span>
            </div>
        ))}
    </div>
);

const MarketTicker = () => {
    const [indicators, setIndicators] = useState(FALLBACK_INDICATORS);

    useEffect(() => {
        let active = true;

        const updateIndicators = (actions) => {
            const updatedIndicators = (actions || [])
                .filter((acao) => acao.cotacaoAtual !== null && acao.cotacaoAtual !== undefined)
                .sort((first, second) => first.ticker.localeCompare(second.ticker, 'pt-BR'))
                .map((acao) => ({
                    symbol: acao.ticker,
                    value: acao.cotacaoAtual,
                    currency: acao.moeda,
                    updatedAt: acao.dataHoraCotacao
                }));

            if (active && updatedIndicators.length > 0) {
                setIndicators(updatedIndicators);
            }
        };

        const loadQuotes = async () => {
            if (!isAuthenticated()) {
                if (active) setIndicators(FALLBACK_INDICATORS);
                return;
            }

            try {
                const response = await apiFetch('/acoes');
                if (!response.ok) throw new Error('Não foi possível carregar as cotações.');
                updateIndicators(await response.json());
            } catch (error) {
                // The ticker keeps the last confirmed values while the API is unavailable.
            }
        };

        const refreshQuotes = async () => {
            if (!isAuthenticated()) {
                if (active) setIndicators(FALLBACK_INDICATORS);
                return;
            }

            try {
                const response = await apiFetch('/acoes/atualizar-cotacoes', { method: 'PUT' });
                if (!response.ok) throw new Error('Não foi possível atualizar as cotações.');
                updateIndicators(await response.json());
            } catch (error) {
                loadQuotes();
            }
        };

        refreshQuotes();
        const refreshInterval = window.setInterval(loadQuotes, 30000);
        const onTickerUpdate = (event) => {
            if (event.detail?.refresh) {
                refreshQuotes();
                return;
            }
            loadQuotes();
        };
        window.addEventListener(MARKET_TICKER_UPDATED_EVENT, onTickerUpdate);

        return () => {
            active = false;
            window.clearInterval(refreshInterval);
            window.removeEventListener(MARKET_TICKER_UPDATED_EVENT, onTickerUpdate);
        };
    }, []);

    return (
        <section className="market-ticker" aria-label="Cotações do catálogo">
            <div className="market-ticker__label">Mercado</div>
            <div className="market-ticker__viewport">
                <div className="market-ticker__track">
                    <IndicatorSet indicators={indicators} />
                    <IndicatorSet indicators={indicators} hidden />
                </div>
            </div>
        </section>
    );
};

export default MarketTicker;
