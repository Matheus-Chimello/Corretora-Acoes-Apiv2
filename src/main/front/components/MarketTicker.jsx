import React, { useEffect, useState } from 'react';
import { apiFetch, getErrorMessage } from '../services/api';
import { getCurrentUser } from '../services/auth';
import { MARKET_TICKER_UPDATED_EVENT } from '../services/marketTicker';

const FALLBACK_INDICATORS = [
    { symbol: 'MGLU3', value: '---', currency: 'BRL', updatedAt: null },
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
    const [message, setMessage] = useState('');

    useEffect(() => {
        let active = true;
        let lastRequest = 0;
        let lastIdentity = getCurrentUser()?.token;

        const updateIndicators = (actions, request) => {
            const updatedIndicators = (actions || [])
                .filter((acao) => acao.cotacaoAtual !== null && acao.cotacaoAtual !== undefined)
                .sort((first, second) => first.ticker.localeCompare(second.ticker, 'pt-BR'))
                .map((acao) => ({
                    symbol: acao.ticker,
                    value: acao.cotacaoAtual,
                    currency: acao.moeda,
                    updatedAt: acao.dataHoraCotacao
                }));

            if (active && request === lastRequest && updatedIndicators.length > 0) {
                setIndicators(updatedIndicators);
            }
        };

        const loadQuotes = async () => {
            const request = ++lastRequest;
            const currentUser = getCurrentUser();
            if (currentUser?.token !== lastIdentity) {
                setIndicators(FALLBACK_INDICATORS);
                setMessage('');
                lastIdentity = currentUser?.token;
            }
            try {
                const response = await apiFetch(currentUser ? '/acoes' : '/api/mercado/cotacoes');
                if (!response.ok) throw new Error(await getErrorMessage(response, 'Não foi possível carregar as cotações.'));
                let actions = await response.json();
                if (currentUser && actions.length === 0) {
                    const marketResponse = await apiFetch('/api/mercado/cotacoes');
                    if (!marketResponse.ok) throw new Error(await getErrorMessage(marketResponse, 'Não foi possível carregar as cotações.'));
                    actions = await marketResponse.json();
                }
                updateIndicators(actions, request);
                if (active && request === lastRequest) setMessage('');
            } catch (error) {
                if (active && request === lastRequest) setMessage(error.message);
            }
        };

        loadQuotes();
        const refreshInterval = window.setInterval(loadQuotes, 30000);
        const onTickerUpdate = () => loadQuotes();
        window.addEventListener(MARKET_TICKER_UPDATED_EVENT, onTickerUpdate);

        return () => {
            active = false;
            window.clearInterval(refreshInterval);
            window.removeEventListener(MARKET_TICKER_UPDATED_EVENT, onTickerUpdate);
        };
    }, []);

    return (
        <section className={`market-ticker${message ? ' market-ticker--error' : ''}`} aria-label="Cotações do catálogo">
            <div className="market-ticker__label">Mercado</div>
            {message && <span role="status" className="market-ticker__status">{message}</span>}
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
